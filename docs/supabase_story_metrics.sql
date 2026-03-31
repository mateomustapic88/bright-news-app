alter table public.stories
add column if not exists saved_count integer not null default 0;

create index if not exists saved_stories_story_id_idx
on public.saved_stories (story_id);

create or replace function public.sync_story_saved_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.stories
    set saved_count = coalesce(saved_count, 0) + 1
    where id = new.story_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.stories
    set saved_count = greatest(coalesce(saved_count, 0) - 1, 0)
    where id = old.story_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists sync_story_saved_count_on_insert on public.saved_stories;
create trigger sync_story_saved_count_on_insert
after insert on public.saved_stories
for each row execute function public.sync_story_saved_count();

drop trigger if exists sync_story_saved_count_on_delete on public.saved_stories;
create trigger sync_story_saved_count_on_delete
after delete on public.saved_stories
for each row execute function public.sync_story_saved_count();

update public.stories s
set saved_count = coalesce(saved_counts.count, 0)
from (
  select story_id, count(*)::integer as count
  from public.saved_stories
  group by story_id
) saved_counts
where s.id = saved_counts.story_id;

update public.stories
set saved_count = 0
where saved_count is null;
