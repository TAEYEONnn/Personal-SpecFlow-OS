create extension if not exists citext;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique check (username ~ '^[a-z0-9_-]{3,32}$'),
  internal_email text not null unique,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  revision integer not null default 0,
  current_document_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  source_type text not null check (source_type in ('paste', 'txt', 'md')),
  content text not null check (char_length(content) between 1 and 100000),
  size_bytes integer not null check (size_bytes <= 1048576),
  created_at timestamptz not null default now()
);

create table public.compilation_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('queued', 'running', 'completed', 'failed')),
  model text not null,
  prompt_version text not null,
  duration_ms integer,
  error_code text,
  error_message text,
  output jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  revision integer not null,
  document jsonb not null,
  source_run_id uuid references public.compilation_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, revision)
);

alter table public.projects
  add constraint projects_current_document_fk
  foreign key (current_document_id)
  references public.project_documents(id)
  on delete set null;

create table public.login_attempts (
  attempt_key text primary key,
  attempt_count integer not null,
  window_started_at timestamptz not null,
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.sources enable row level security;
alter table public.compilation_runs enable row level security;
alter table public.project_documents enable row level security;
alter table public.login_attempts enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);
create policy "projects_own_all" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sources_own_all" on public.sources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "runs_own_all" on public.compilation_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "documents_own_all" on public.project_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.save_project_document(
  p_project_id uuid,
  p_expected_revision integer,
  p_document jsonb,
  p_run_id uuid default null
) returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_revision integer;
  next_document_id uuid;
begin
  update public.projects
  set revision = revision + 1, updated_at = now()
  where id = p_project_id
    and user_id = auth.uid()
    and revision = p_expected_revision
  returning revision into next_revision;

  if next_revision is null then
    raise exception 'revision_conflict';
  end if;

  insert into public.project_documents (
    project_id, user_id, revision, document, source_run_id
  ) values (
    p_project_id, auth.uid(), next_revision, p_document, p_run_id
  ) returning id into next_document_id;

  update public.projects
  set current_document_id = next_document_id
  where id = p_project_id and user_id = auth.uid();

  return next_revision;
end;
$$;
