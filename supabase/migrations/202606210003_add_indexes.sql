-- Add missing indexes on frequently-queried foreign key columns
CREATE INDEX IF NOT EXISTS idx_sources_project_id
  ON public.sources(project_id);

CREATE INDEX IF NOT EXISTS idx_project_documents_project_id
  ON public.project_documents(project_id);

CREATE INDEX IF NOT EXISTS idx_compilation_runs_project_id
  ON public.compilation_runs(project_id);

CREATE INDEX IF NOT EXISTS idx_compilation_runs_created_at
  ON public.compilation_runs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_documents_revision
  ON public.project_documents(project_id, revision DESC);
