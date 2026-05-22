alter table public.profiles
add column if not exists plan text not null default 'free',
add column if not exists premium_until timestamptz,
add column if not exists google_play_purchase_token text,
add column if not exists google_play_product_id text;

create table if not exists public.source_link_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  opened_at timestamptz not null default now()
);

create index if not exists source_link_reads_user_opened_idx
on public.source_link_reads (user_id, opened_at desc);

alter table public.source_link_reads enable row level security;

drop policy if exists "Users can read their own source reads" on public.source_link_reads;
drop policy if exists "Users can insert their own source reads" on public.source_link_reads;

create policy "Users can read their own source reads"
on public.source_link_reads
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own source reads"
on public.source_link_reads
for insert
to authenticated
with check (auth.uid() = user_id);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_regions text[] not null default '{}',
  preferred_categories text[] not null default '{}',
  strict_positive_filter boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "Users can read their own preferences" on public.user_preferences;
drop policy if exists "Users can update their own preferences" on public.user_preferences;
drop policy if exists "Users can insert their own preferences" on public.user_preferences;

create policy "Users can read their own preferences"
on public.user_preferences
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own preferences"
on public.user_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own preferences"
on public.user_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
