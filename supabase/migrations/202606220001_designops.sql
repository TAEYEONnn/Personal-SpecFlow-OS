-- Add updated_at to sources for change tracking
ALTER TABLE sources ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add needs_recompile flag to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS needs_recompile boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Auto-update sources.updated_at on row update
DROP TRIGGER IF EXISTS set_sources_updated_at ON sources;
CREATE TRIGGER set_sources_updated_at
  BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
