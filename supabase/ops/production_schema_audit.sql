-- Production schema audit for SpecFlow OS.
-- Safe to run. It only reads metadata and does not expose secret keys.

select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'profiles',
    'projects',
    'sources',
    'compilation_runs',
    'teams',
    'team_members',
    'team_invitations',
    'chat_messages',
    'tasks',
    'notes'
  )
order by table_name, ordinal_position;

select
  'profiles.user_id' as requirement,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id'
  ) as present
union all
select 'profiles.username', exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name = 'username'
)
union all
select 'profiles.internal_email', exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name = 'internal_email'
)
union all
select 'profiles.display_name', exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name = 'display_name'
)
union all
select 'projects.team_id', exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'projects' and column_name = 'team_id'
)
union all
select 'projects.needs_recompile', exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'projects' and column_name = 'needs_recompile'
)
union all
select 'sources.updated_at', exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'sources' and column_name = 'updated_at'
);

select
  u.id as auth_user_id,
  left(coalesce(u.email, ''), 2) || '***' ||
    case when position('@' in coalesce(u.email, '')) > 0
      then substring(u.email from position('@' in u.email))
      else ''
    end as masked_email,
  p.username,
  p.internal_email is not null as has_internal_email,
  p.display_name
from auth.users u
left join public.profiles p on p.user_id = u.id
order by u.created_at desc;

select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'projects',
    'sources',
    'compilation_runs',
    'project_documents',
    'teams',
    'team_members',
    'team_invitations',
    'chat_messages',
    'tasks',
    'notes'
  )
order by tablename, policyname;
