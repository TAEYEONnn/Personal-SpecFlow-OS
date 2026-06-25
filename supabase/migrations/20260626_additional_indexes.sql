-- Additional performance indexes

-- Tasks: common query patterns
create index if not exists idx_tasks_created_by_personal
  on public.tasks(created_by, is_personal)
  where is_personal = true;

create index if not exists idx_tasks_status
  on public.tasks(team_id, status)
  where team_id is not null;

create index if not exists idx_tasks_assignee_status
  on public.tasks(assignee_id, status)
  where assignee_id is not null;

-- Notes: common query patterns
create index if not exists idx_notes_created_by_personal
  on public.notes(created_by, visibility)
  where visibility = 'personal';

create index if not exists idx_notes_team_kind
  on public.notes(team_id, kind, updated_at desc)
  where visibility = 'team';

create index if not exists idx_notes_updated_at
  on public.notes(updated_at desc);

-- Profiles: lookup by user_id (if not already primary key)
create index if not exists idx_profiles_user_id
  on public.profiles(user_id);

-- Team invitations: check pending status
create index if not exists idx_team_invitations_status
  on public.team_invitations(status, team_id)
  where status = 'pending';
