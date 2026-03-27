alter table public.stories enable row level security;

create policy "Anyone can read stories"
on public.stories
for select
to anon, authenticated
using (true);
