alter table public.stories
add column if not exists image_url text not null default '';

update public.stories s
set image_url = coalesce(ra.image_url, '')
from public.raw_articles ra
where (
  ra.published_story_id = s.id
  or ra.source_url = s.source_url
)
and coalesce(ra.image_url, '') <> '';
