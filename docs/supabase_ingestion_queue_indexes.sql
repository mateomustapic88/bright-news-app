-- Small partial indexes for the scheduled review and publishing queues.
create index if not exists raw_articles_pending_region_date_idx
on public.raw_articles (region_code, published_at desc nulls last)
where published_story_id is null and review_status = 'pending';

create index if not exists raw_articles_approved_date_idx
on public.raw_articles (published_at desc nulls last)
where published_story_id is null and review_status = 'approved';

analyze public.raw_articles;
