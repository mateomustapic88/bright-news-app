-- Required by the duplicate-safe publisher. Existing duplicate source URLs must
-- be resolved deliberately before applying; this migration never deletes stories.
create unique index if not exists stories_source_url_unique_idx
  on public.stories (source_url);

notify pgrst, 'reload schema';
