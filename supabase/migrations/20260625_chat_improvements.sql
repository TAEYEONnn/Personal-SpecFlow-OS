-- Chat improvements: soft delete, announcements, mentions, indexes

-- 1. Soft delete support
alter table public.chat_messages
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

-- 2. Announcement support
create table if not exists public.chat_announcements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  announced_by uuid not null references auth.users(id) on delete cascade,
  announced_at timestamptz not null default now(),
  unique (team_id, message_id)
);

create index if not exists idx_chat_announcements_team on public.chat_announcements(team_id, announced_at desc);

-- 3. Mentions support
create table if not exists public.chat_message_mentions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  mentioned_user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (message_id, mentioned_user_id)
);

create index if not exists idx_chat_mentions_message on public.chat_message_mentions(message_id);
create index if not exists idx_chat_mentions_user on public.chat_message_mentions(mentioned_user_id);
create index if not exists idx_chat_mentions_team_user on public.chat_message_mentions(team_id, mentioned_user_id);
create index if not exists idx_chat_messages_team_deleted on public.chat_messages(team_id, created_at desc) where deleted_at is null;

-- 4. RLS for new tables
alter table public.chat_announcements enable row level security;
alter table public.chat_message_mentions enable row level security;

-- Helper: is team member
create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

-- Helper: get team role
create or replace function public.get_team_role(p_team_id uuid)
returns text
language sql
security definer
stable
as $$
  select role from public.team_members
  where team_id = p_team_id and user_id = auth.uid()
  limit 1;
$$;

-- chat_announcements RLS
drop policy if exists "team members can view announcements" on public.chat_announcements;
create policy "team members can view announcements"
  on public.chat_announcements for select
  using (public.is_team_member(team_id));

drop policy if exists "admins can manage announcements" on public.chat_announcements;
create policy "admins can manage announcements"
  on public.chat_announcements for all
  using (public.get_team_role(team_id) in ('owner', 'admin'));

-- chat_message_mentions RLS
drop policy if exists "team members can view mentions" on public.chat_message_mentions;
create policy "team members can view mentions"
  on public.chat_message_mentions for select
  using (public.is_team_member(team_id));

drop policy if exists "team members can insert mentions" on public.chat_message_mentions;
create policy "team members can insert mentions"
  on public.chat_message_mentions for insert
  with check (public.is_team_member(team_id));

-- Supabase Realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'chat_announcements'
  ) then
    alter publication supabase_realtime add table public.chat_announcements;
  end if;
end $$;
