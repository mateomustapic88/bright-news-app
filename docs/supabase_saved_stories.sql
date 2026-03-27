create table if not exists public.saved_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, story_id)
);

alter table public.saved_stories enable row level security;

create policy "Users can read their saved stories"
on public.saved_stories
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their saved stories"
on public.saved_stories
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete their saved stories"
on public.saved_stories
for delete
to authenticated
using (auth.uid() = user_id);
