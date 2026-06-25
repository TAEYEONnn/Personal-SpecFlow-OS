-- =============================================================
-- Performance indexes for common query patterns
-- All use IF NOT EXISTS — safe to run multiple times.
-- =============================================================

-- chat_messages: primary listing (team_id + created_at desc, non-deleted only)
-- Used by: listMessages(), Realtime filter
create index if not exists idx_chat_messages_team_created
  on public.chat_messages(team_id, created_at desc)
  where deleted_at is null;

-- chat_announcements: team listing ordered by date
create index if not exists idx_chat_announcements_team_date
  on public.chat_announcements(team_id, announced_at desc);

-- team_members: membership check (very frequent — every RLS policy)
create index if not exists idx_team_members_team_user
  on public.team_members(team_id, user_id);

-- team_members: my teams lookup
create index if not exists idx_team_members_user
  on public.team_members(user_id);

-- projects: team listing sorted by updated
create index if not exists idx_projects_team_updated
  on public.projects(team_id, updated_at desc)
  where team_id is not null;

-- tasks: team listing
create index if not exists idx_tasks_team_created
  on public.tasks(team_id, created_at desc);

-- notes: team listing
create index if not exists idx_notes_team_updated
  on public.notes(team_id, updated_at desc);
