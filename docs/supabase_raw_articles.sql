create table if not exists public.raw_articles (
  id uuid primary key default gen_random_uuid(),
  vendor text not null,
  external_id text,
  source_url text not null unique,
  source_name text not null default '',
  title text not null default '',
  description text not null default '',
  content text not null default '',
  image_url text not null default '',
  published_at timestamptz,
  region_code text not null default 'world',
  country_code text,
  category text not null,
  emoji text not null default '',
  review_status text not null default 'pending',
  review_notes text not null default '',
  rejected_reason text not null default '',
  published_story_id uuid references public.stories(id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint raw_articles_review_status_check check (review_status in ('pending', 'approved', 'rejected', 'published'))
);

create or replace function public.set_raw_articles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_raw_articles_updated_at on public.raw_articles;

create trigger set_raw_articles_updated_at
before update on public.raw_articles
for each row
execute function public.set_raw_articles_updated_at();

alter table public.raw_articles enable row level security;

drop policy if exists "Authenticated users can read raw articles" on public.raw_articles;
drop policy if exists "Authenticated users can review raw articles" on public.raw_articles;
drop policy if exists "Admins can read raw articles" on public.raw_articles;
drop policy if exists "Admins can update raw articles" on public.raw_articles;

create policy "Admins can read raw articles"
on public.raw_articles
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);

create policy "Admins can update raw articles"
on public.raw_articles
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_admin = true
  )
);
