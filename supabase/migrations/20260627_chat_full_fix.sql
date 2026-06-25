-- =============================================================
-- Chat Full Fix: reactions table, soft_delete RPC, send_message RPC
-- =============================================================

-- 1. Revert overly-broad UPDATE policy from 20260626_chat_rls_fix.sql
--    Owner/admin soft delete is handled by security definer RPC (bypasses RLS).
--    Direct UPDATE on chat_messages is author-only (content edit only).
drop policy if exists "chat_messages_update" on public.chat_messages;
create policy "chat_messages_update" on public.chat_messages
  for update using (author_id = auth.uid());

-- 2. chat_message_reactions table
create table if not exists public.chat_message_reactions (
  id         uuid        primary key default gen_random_uuid(),
  message_id uuid        not null references public.chat_messages(id) on delete cascade,
  user_id    uuid        not null references auth.users(id)           on delete cascade,
  team_id    uuid        not null references public.teams(id)         on delete cascade,
  emoji      text        not null check (char_length(emoji) <= 8),
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create index if not exists idx_chat_reactions_message on public.chat_message_reactions(message_id);
create index if not exists idx_chat_reactions_team    on public.chat_message_reactions(team_id);

alter table public.chat_message_reactions enable row level security;

drop policy if exists "reactions_select" on public.chat_message_reactions;
create policy "reactions_select" on public.chat_message_reactions
  for select using (public.is_team_member(team_id));

drop policy if exists "reactions_insert" on public.chat_message_reactions;
create policy "reactions_insert" on public.chat_message_reactions
  for insert with check (
    user_id = auth.uid()
    and public.is_team_member(team_id)
  );

drop policy if exists "reactions_delete" on public.chat_message_reactions;
create policy "reactions_delete" on public.chat_message_reactions
  for delete using (user_id = auth.uid());

-- 3. soft_delete_chat_message RPC
--    Security definer: bypasses RLS; checks author OR owner/admin internally.
create or replace function public.soft_delete_chat_message(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id  uuid;
  v_author   uuid;
  v_role     text;
begin
  select team_id, author_id
    into v_team_id, v_author
    from public.chat_messages
   where id = p_message_id
     and deleted_at is null;

  if not found then
    raise exception 'MESSAGE_NOT_FOUND';
  end if;

  if v_author = auth.uid() then
    -- author can always delete own message
    null;
  else
    v_role := public.get_team_role(v_team_id);
    if v_role not in ('owner', 'admin') then
      raise exception 'FORBIDDEN';
    end if;
  end if;

  update public.chat_messages
     set deleted_at = now(),
         deleted_by = auth.uid()
   where id = p_message_id;
end;
$$;

-- 4. send_message_with_mentions RPC
--    Atomically inserts message + mentions in one transaction.
--    Invalid/non-member mentions are silently skipped (ON CONFLICT DO NOTHING).
create or replace function public.send_message_with_mentions(
  p_team_id          uuid,
  p_content          text,
  p_parent_message_id uuid default null,
  p_mention_user_ids  uuid[] default '{}'::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id uuid;
  v_uid        uuid;
begin
  -- caller must be a team member
  if not public.is_team_member(p_team_id) then
    raise exception 'FORBIDDEN';
  end if;

  -- insert message
  insert into public.chat_messages(team_id, content, author_id, parent_message_id)
  values (p_team_id, p_content, auth.uid(), p_parent_message_id)
  returning id into v_message_id;

  -- insert mentions (only team members, not self, no duplicates)
  if array_length(p_mention_user_ids, 1) > 0 then
    foreach v_uid in array p_mention_user_ids loop
      continue when v_uid = auth.uid();
      continue when not exists (
        select 1 from public.team_members
         where team_id = p_team_id and user_id = v_uid
      );
      insert into public.chat_message_mentions(message_id, mentioned_user_id, team_id)
      values (v_message_id, v_uid, p_team_id)
      on conflict do nothing;
    end loop;
  end if;

  return v_message_id;
end;
$$;

-- 5. Realtime publication – add all chat tables idempotently
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
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and tablename = 'chat_message_mentions'
  ) then
    alter publication supabase_realtime add table public.chat_message_mentions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and tablename = 'chat_message_reactions'
  ) then
    alter publication supabase_realtime add table public.chat_message_reactions;
  end if;
end $$;
