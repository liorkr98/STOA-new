-- Newsletter fan-out + social notifications (Substack-style engagement loop).
-- All functions are SECURITY DEFINER so they can write notifications for other
-- users while still verifying the acting user via auth.uid().

-- Notify an analyst's followers and active subscribers when they publish.
create or replace function notify_publication(p_report_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_report reports%rowtype;
  v_title text;
  v_count int := 0;
begin
  if v_actor is null then return 0; end if;

  select * into v_report from reports where id = p_report_id;
  if not found then return 0; end if;
  if v_report.author_id <> v_actor then return 0; end if;
  if v_report.status <> 'published' then return 0; end if;

  v_title := coalesce(nullif(v_report.title, ''), nullif(v_report.summary, ''), 'a new publication');

  insert into notifications (recipient_id, actor_id, kind, body, link)
  select distinct r.recipient, v_actor, 'publication',
    'published "' || left(v_title, 80) || '"',
    '/report/' || p_report_id
  from (
    select follower_id as recipient from follows where analyst_id = v_actor
    union
    select subscriber_id as recipient from subscriptions
      where analyst_id = v_actor and status = 'active' and renews_at > now()
  ) r
  where r.recipient <> v_actor;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function notify_publication(uuid) to authenticated;

-- Notify an analyst that someone followed them.
create or replace function notify_follow(p_analyst_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or v_actor = p_analyst_id then return; end if;
  insert into notifications (recipient_id, actor_id, kind, body, link)
  values (p_analyst_id, v_actor, 'follow', 'started following you', null);
end;
$$;

grant execute on function notify_follow(uuid) to authenticated;

-- Notify a report's author about a like or comment.
create or replace function notify_report_event(p_report_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_author uuid;
  v_title text;
  v_body text;
begin
  if v_actor is null then return; end if;
  if p_kind not in ('like', 'comment') then return; end if;

  select author_id, coalesce(nullif(title, ''), nullif(summary, ''), 'your post')
    into v_author, v_title
  from reports where id = p_report_id;

  if v_author is null or v_author = v_actor then return; end if;

  v_body := case p_kind
    when 'like' then 'liked "' || left(v_title, 60) || '"'
    else 'commented on "' || left(v_title, 60) || '"'
  end;

  insert into notifications (recipient_id, actor_id, kind, body, link)
  values (v_author, v_actor, p_kind, v_body, '/report/' || p_report_id);
end;
$$;

grant execute on function notify_report_event(uuid, text) to authenticated;
