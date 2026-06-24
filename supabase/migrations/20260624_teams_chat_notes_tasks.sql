-- Teams, collaboration workspace, and production schema repair.
-- This migration is intentionally idempotent so it can be run safely against
-- production databases where part of the 2026-06-24 migration may already exist.

create extension if not exists pgcrypto;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.profiles
  add column if not exists display_name text check (
    display_name is null or char_length(display_name) <= 80
  );

alter table public.projects
  add column if not exists team_id uuid,
  add column if not exists needs_recompile boolean not null default false;

alter table public.sources
  add column if not exists updated_at timestamptz default now();

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  role text not null check (role in ('member', 'admin')),
  token text not null unique,
  status text not null check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  expires_at timestamptz not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 10000),
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_message_id uuid references public.chat_messages(id) on delete set null,
  reactions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description text,
  status text not null check (status in ('todo', 'inProgress', 'done')) default 'todo',
  priority text not null check (priority in ('low', 'medium', 'high')) default 'medium',
  due_date timestamptz,
  is_personal boolean not null default true,
  team_id uuid references public.teams(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  assignee_id uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  title text check (title is null or char_length(title) <= 200),
  content text not null default '',
  kind text not null check (kind in ('note', 'scratch')),
  visibility text not null check (visibility in ('personal', 'team')),
  team_id uuid references public.teams(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  pinned boolean not null default false,
  created_by uuid not null references auth.users(id) on delete cascade,
  updated_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projects_team_id_fkey'
  ) then
    alter table public.projects
      add constraint projects_team_id_fkey
      foreign key (team_id) references public.teams(id) on delete set null;
  end if;
end $$;

create index if not exists idx_team_members_team on public.team_members(team_id);
create index if not exists idx_team_members_user on public.team_members(user_id);
create index if not exists idx_team_invitations_team on public.team_invitations(team_id);
create index if not exists idx_team_invitations_token on public.team_invitations(token);
create index if not exists idx_chat_messages_team on public.chat_messages(team_id);
create index if not exists idx_chat_messages_created on public.chat_messages(team_id, created_at desc);
create index if not exists idx_tasks_created_by on public.tasks(created_by);
create index if not exists idx_tasks_team on public.tasks(team_id);
create index if not exists idx_tasks_assignee on public.tasks(assignee_id);
create index if not exists idx_notes_created_by on public.notes(created_by);
create index if not exists idx_notes_team on public.notes(team_id);
create index if not exists idx_projects_team on public.projects(team_id);

drop trigger if exists set_sources_updated_at on public.sources;
create trigger set_sources_updated_at
  before update on public.sources
  for each row execute function public.handle_updated_at();

drop trigger if exists set_chat_messages_updated_at on public.chat_messages;
create trigger set_chat_messages_updated_at
  before update on public.chat_messages
  for each row execute function public.handle_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute function public.handle_updated_at();

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
  before update on public.notes
  for each row execute function public.handle_updated_at();

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invitations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;

create or replace function public.is_team_member(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = p_user_id
  );
$$;

create or replace function public.is_team_manager(p_team_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = p_user_id and role in ('owner', 'admin')
  );
$$;

create or replace function public.create_team_with_owner(p_name text)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  created_team public.teams;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_name is null or char_length(trim(p_name)) = 0 or char_length(trim(p_name)) > 120 then
    raise exception 'invalid team name';
  end if;

  insert into public.teams(name, owner_id)
  values (trim(p_name), auth.uid())
  returning * into created_team;

  insert into public.team_members(team_id, user_id, role)
  values (created_team.id, auth.uid(), 'owner');

  return created_team;
end;
$$;

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "teams_select_member" on public.teams;
create policy "teams_select_member" on public.teams
  for select using (public.is_team_member(id, auth.uid()));
drop policy if exists "teams_insert" on public.teams;
create policy "teams_insert" on public.teams
  for insert with check (auth.uid() = owner_id);
drop policy if exists "teams_update_manager" on public.teams;
create policy "teams_update_manager" on public.teams
  for update using (public.is_team_manager(id, auth.uid()));
drop policy if exists "teams_delete_owner" on public.teams;
create policy "teams_delete_owner" on public.teams
  for delete using (auth.uid() = owner_id);

drop policy if exists "team_members_select" on public.team_members;
create policy "team_members_select" on public.team_members
  for select using (public.is_team_member(team_id, auth.uid()));
drop policy if exists "team_members_insert" on public.team_members;
create policy "team_members_insert" on public.team_members
  for insert with check (public.is_team_manager(team_id, auth.uid()));
drop policy if exists "team_members_update" on public.team_members;
create policy "team_members_update" on public.team_members
  for update using (public.is_team_manager(team_id, auth.uid()));
drop policy if exists "team_members_delete" on public.team_members;
create policy "team_members_delete" on public.team_members
  for delete using (public.is_team_manager(team_id, auth.uid()) or user_id = auth.uid());

drop policy if exists "team_invitations_select_member" on public.team_invitations;
create policy "team_invitations_select_member" on public.team_invitations
  for select using (public.is_team_member(team_id, auth.uid()));
drop policy if exists "team_invitations_insert" on public.team_invitations;
create policy "team_invitations_insert" on public.team_invitations
  for insert with check (public.is_team_manager(team_id, auth.uid()));
drop policy if exists "team_invitations_update" on public.team_invitations;
create policy "team_invitations_update" on public.team_invitations
  for update using (public.is_team_manager(team_id, auth.uid()));
drop policy if exists "team_invitations_delete" on public.team_invitations;
create policy "team_invitations_delete" on public.team_invitations
  for delete using (public.is_team_manager(team_id, auth.uid()));

drop policy if exists "chat_messages_select" on public.chat_messages;
create policy "chat_messages_select" on public.chat_messages
  for select using (public.is_team_member(team_id, auth.uid()));
drop policy if exists "chat_messages_insert" on public.chat_messages;
create policy "chat_messages_insert" on public.chat_messages
  for insert with check (public.is_team_member(team_id, auth.uid()) and author_id = auth.uid());
drop policy if exists "chat_messages_update" on public.chat_messages;
create policy "chat_messages_update" on public.chat_messages
  for update using (author_id = auth.uid());
drop policy if exists "chat_messages_delete" on public.chat_messages;
create policy "chat_messages_delete" on public.chat_messages
  for delete using (author_id = auth.uid());

drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select using (
    created_by = auth.uid()
    or (team_id is not null and public.is_team_member(team_id, auth.uid()))
    or assignee_id = auth.uid()
  );
drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert with check (created_by = auth.uid());
drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update using (created_by = auth.uid() or assignee_id = auth.uid());
drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete using (created_by = auth.uid());

drop policy if exists "notes_select" on public.notes;
create policy "notes_select" on public.notes
  for select using (
    created_by = auth.uid()
    or (visibility = 'team' and team_id is not null and public.is_team_member(team_id, auth.uid()))
  );
drop policy if exists "notes_insert" on public.notes;
create policy "notes_insert" on public.notes
  for insert with check (created_by = auth.uid());
drop policy if exists "notes_update" on public.notes;
create policy "notes_update" on public.notes
  for update using (created_by = auth.uid());
drop policy if exists "notes_delete" on public.notes;
create policy "notes_delete" on public.notes
  for delete using (created_by = auth.uid());

drop policy if exists "projects_team_select" on public.projects;
create policy "projects_team_select" on public.projects
  for select using (
    auth.uid() = user_id
    or (team_id is not null and public.is_team_member(team_id, auth.uid()))
  );

drop policy if exists "sources_team_select" on public.sources;
create policy "sources_team_select" on public.sources
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = sources.project_id
        and p.team_id is not null
        and public.is_team_member(p.team_id, auth.uid())
    )
  );

drop policy if exists "runs_team_select" on public.compilation_runs;
create policy "runs_team_select" on public.compilation_runs
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = compilation_runs.project_id
        and p.team_id is not null
        and public.is_team_member(p.team_id, auth.uid())
    )
  );

drop policy if exists "documents_team_select" on public.project_documents;
create policy "documents_team_select" on public.project_documents
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_documents.project_id
        and p.team_id is not null
        and public.is_team_member(p.team_id, auth.uid())
    )
  );
