create table if not exists public.story_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  reason text not null check (
    reason in (
      'negative_scary',
      'political',
      'violence_crime',
      'misleading_category',
      'other'
    )
  ),
  status text not null default 'pending' check (
    status in ('pending', 'reviewed', 'dismissed')
  ),
  created_at timestamptz not null default now(),
  unique (user_id, story_id)
);

alter table public.story_reports
alter column user_id set default auth.uid();

alter table public.story_reports enable row level security;

drop policy if exists "Users can insert their story reports" on public.story_reports;
drop policy if exists "Users can read their story reports" on public.story_reports;

create policy "Users can insert their story reports"
on public.story_reports
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can read their story reports"
on public.story_reports
for select
to authenticated
using (auth.uid() = user_id);

grant select, insert on public.story_reports to authenticated;

create index if not exists story_reports_story_id_idx
on public.story_reports (story_id);

create index if not exists story_reports_status_created_at_idx
on public.story_reports (status, created_at desc);
