-- Add 'pdf' to allowed source_type values (was missing in initial migration)
ALTER TABLE public.sources
  DROP CONSTRAINT IF EXISTS sources_source_type_check;

ALTER TABLE public.sources
  ADD CONSTRAINT sources_source_type_check
  CHECK (source_type IN ('paste', 'txt', 'md', 'pdf'));

-- Fix size_bytes constraint: initial migration used 1MB (1048576) but app allows 10MB
ALTER TABLE public.sources
  DROP CONSTRAINT IF EXISTS sources_size_bytes_check;

ALTER TABLE public.sources
  ADD CONSTRAINT sources_size_bytes_check
  CHECK (size_bytes <= 10485760);
