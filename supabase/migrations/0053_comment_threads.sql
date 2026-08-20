-- Backend brief item 6: discussions.
--
-- `comments` was flat, so the Feed's one-level replies were posted as top-level
-- comments carrying an @mention. This adds real one-level threading plus per-user
-- likes (the old `comments.likes` counter could not tell who had liked what, so
-- the UI could not show a like as "on").

alter table comments
  add column if not exists parent_id uuid references comments (id) on delete cascade;

-- Exactly one level: a reply may not itself be replied to. Enforced with a
-- trigger because a CHECK cannot query another row.
create or replace function enforce_comment_depth()
returns trigger language plpgsql set search_path = public as $$
declare
  v_parent_parent uuid;
  v_parent_report uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select parent_id, report_id into v_parent_parent, v_parent_report
    from comments where id = new.parent_id;

  if not found then
    raise exception 'parent comment not found';
  end if;
  if v_parent_parent is not null then
    raise exception 'replies are one level deep';
  end if;
  -- A reply must live on the same publication as its parent.
  if v_parent_report is distinct from new.report_id then
    raise exception 'reply must belong to the same report as its parent';
  end if;

  return new;
end;
$$;

drop trigger if exists comments_enforce_depth on comments;
create trigger comments_enforce_depth
  before insert or update of parent_id on comments
  for each row execute function enforce_comment_depth();

-- Thread reads are "top-level for a report" then "replies for those parents".
create index if not exists comments_report_parent_created_idx
  on comments (report_id, parent_id, created_at desc);

-- Per-user likes, so the UI can render a like as on/off for the reader.
create table if not exists comment_likes (
  comment_id uuid not null references comments (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists comment_likes_user_idx on comment_likes (user_id);

alter table comment_likes enable row level security;

-- Anyone signed in may read who liked what (likes are public on a public thread)
-- but may only add or remove their own.
drop policy if exists comment_likes_read on comment_likes;
create policy comment_likes_read on comment_likes for select using (true);

drop policy if exists comment_likes_own_insert on comment_likes;
create policy comment_likes_own_insert on comment_likes
  for insert with check (user_id = auth.uid());

drop policy if exists comment_likes_own_delete on comment_likes;
create policy comment_likes_own_delete on comment_likes
  for delete using (user_id = auth.uid());

-- Keep the denormalised counter on `comments` in step with the join table, so
-- existing reads that select `likes` stay correct without a count(*) per row.
create or replace function sync_comment_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update comments set likes = likes + 1 where id = new.comment_id;
  elsif tg_op = 'DELETE' then
    update comments set likes = greatest(0, likes - 1) where id = old.comment_id;
  end if;
  return null;
end;
$$;

drop trigger if exists comment_likes_sync on comment_likes;
create trigger comment_likes_sync
  after insert or delete on comment_likes
  for each row execute function sync_comment_like_count();
