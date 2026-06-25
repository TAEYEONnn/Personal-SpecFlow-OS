-- Fix: chat_messages UPDATE policy must allow owner/admin for soft delete
-- The 20260624 migration only allows author_id = auth.uid() for UPDATE,
-- which blocks owner/admin from setting deleted_at on others' messages.

drop policy if exists "chat_messages_update" on public.chat_messages;
create policy "chat_messages_update" on public.chat_messages
  for update using (
    author_id = auth.uid()
    or public.get_team_role(team_id) in ('owner', 'admin')
  );

-- Ensure chat_message_mentions INSERT policy exists
-- (may not have run if 20260625 was partially applied)
drop policy if exists "team members can insert mentions" on public.chat_message_mentions;
create policy "team members can insert mentions"
  on public.chat_message_mentions for insert
  with check (public.is_team_member(team_id));

-- Ensure chat_announcements ALL policy covers INSERT explicitly
-- (some Supabase versions need separate insert/update/delete)
drop policy if exists "admins can manage announcements" on public.chat_announcements;
create policy "admins can view all announcements"
  on public.chat_announcements for select
  using (public.is_team_member(team_id));
create policy "admins can insert announcements"
  on public.chat_announcements for insert
  with check (public.get_team_role(team_id) in ('owner', 'admin'));
create policy "admins can delete announcements"
  on public.chat_announcements for delete
  using (public.get_team_role(team_id) in ('owner', 'admin'));

-- Ensure Realtime publication covers all chat tables
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
end $$;
