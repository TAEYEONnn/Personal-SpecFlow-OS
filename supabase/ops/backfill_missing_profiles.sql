-- Backfill missing public.profiles rows for existing Supabase Auth users.
-- Review production_schema_audit.sql output before running.
-- Existing profile rows are not overwritten.

insert into public.profiles (user_id, username, internal_email, display_name)
select
  u.id,
  candidate.username,
  u.email,
  candidate.username
from auth.users u
cross join lateral (
  select lower(
    left(
      regexp_replace(
        coalesce(nullif(split_part(u.email, '@', 1), ''), 'user-' || left(u.id::text, 8)),
        '[^a-zA-Z0-9_-]+',
        '-',
        'g'
      ),
      23
    ) || '-' || left(u.id::text, 8)
  ) as username
) candidate
left join public.profiles p on p.user_id = u.id
where p.user_id is null
  and u.email is not null
on conflict (user_id) do nothing;

select
  count(*) filter (where p.user_id is not null) as profiles_total,
  count(*) filter (where p.user_id is null) as auth_users_missing_profile
from auth.users u
left join public.profiles p on p.user_id = u.id;
