create table if not exists public.story_social_posts (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  platform text not null,
  external_post_id text not null default '',
  external_post_url text not null default '',
  post_text text not null default '',
  posted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (story_id, platform)
);

create index if not exists story_social_posts_platform_posted_at_idx
on public.story_social_posts (platform, posted_at desc);

alter table public.story_social_posts enable row level security;
