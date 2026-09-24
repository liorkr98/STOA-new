-- Retiring grading: the data.
--
-- Grading is removed from the product. A publication keeps its stance (ticker
-- and direction, migration 0065); nothing is graded, scored or resolved. This
-- migration retires what grading left in the database. It deletes no
-- publication and drops no table.
--
-- ORDER
--   Needs 0065 (reports.stance) and 0066 (the stance-and-purchases delete
--   rule). Apply it after the code that stops writing calls is live: from
--   here on the calls table refuses every insert, so the old publish path,
--   which still recorded a call, would fail.
--
-- WHAT IT DOES
--   1. Checks its footing, and changes nothing if 0065 or 0066 is missing or
--      a call's direction is not carried by its publication.
--   2. "Waiting for grade review" becomes published. The status meant a
--      call had reached its horizon with no closing price, so a person had
--      to grade it. With nothing to grade, those publications are simply
--      live. On 2026-09-24 that was 30 publications, all demo accounts. The
--      status is then refused.
--   3. The Verdict type is relabelled, so nothing prints VERDICT: a verdict
--      whose text runs past a brief's 300 characters becomes a thesis, the
--      rest become briefs. On 2026-09-24: 907 verdicts, 758 theses and 149
--      briefs by that rule (all but one on demo accounts). The type is then
--      refused.
--   4. The scores are cleared: every profile's score, rating, tier and
--      breakdown back to their defaults, and every score snapshot deleted.
--      On 2026-09-24: 40 scored profiles and 403 snapshots, all demo.
--   5. The calls table becomes a read-only archive. The tamper-evidence
--      guards (terms frozen, deletion blocked, each grading logged) are
--      dropped and one rule replaces them: no insert, no update, no delete,
--      no truncate. The demo purge keeps the one exception it already had.
--      The table is still read for one thing: before 0065 a publication's
--      direction lived only on its call, and the app reads it from there
--      as a fallback. Dropping the table is the next release.
--   6. Every access rule, counter and trigger that named the review status
--      is rewritten without it, each copied from its latest definition with
--      only that change. The delete rule no longer looks at calls (every
--      call's direction is its publication's stance since 0065). Analyst
--      search no longer sorts by score.
--
-- WHAT IT LEAVES FOR THE RELEASE THAT DROPS `predictions`
--   The table itself; the platform_stats view's locked_calls_tracked column;
--   the RPCs resolved_counts_by_authors, ticker_call_activity and
--   get_moat_snapshots; the moat_score_snapshots table; the score columns on
--   profiles; the 'call' and 'resolution_pending_review' enum values (Postgres
--   cannot drop an enum value in place); the demo purge's delete of calls;
--   and the app's fallback read of a call's direction.

-- ============================================================
-- 1. Footing
-- ============================================================
do $$
declare
  v_mismatch int;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'reports' and column_name = 'stance'
  ) then
    raise exception 'Apply 0065_publication_stance first: reports.stance does not exist. Nothing was changed.';
  end if;

  if position('report_unlocks' in pg_get_functiondef('prevent_locked_report_delete()'::regprocedure)) = 0 then
    raise exception 'Apply 0066_delete_rule_stance_and_purchases first. Nothing was changed.';
  end if;

  select count(*) into v_mismatch
  from predictions p join reports r on r.id = p.report_id
  where r.ticker is distinct from p.ticker or r.stance is distinct from p.direction;
  if v_mismatch > 0 then
    raise exception
      '% calls are not carried by their publication''s stance. Nothing was changed.', v_mismatch;
  end if;
end;
$$;

-- ============================================================
-- 2 and 3. Statuses and types
-- ============================================================
-- None of this is an edit by an analyst: nobody's "last edited" moves, no
-- "report.locked" lands in the audit log for a publication that was locked
-- long ago, and the lock rule, which freezes a published type, is paused for
-- the relabel only.
alter table reports disable trigger reports_updated_at;
alter table reports disable trigger audit_report_transitions_trg;
alter table reports disable trigger enforce_report_immutability;

update reports
set status = 'published'
where status = 'resolution_pending_review';

update reports r
set type = case
  when coalesce((select length(btrim(b.body)) from report_bodies b where b.report_id = r.id), 0) > 300
    then 'research'::content_type
  else 'short_post'::content_type
end
where r.type = 'call';

alter table reports enable trigger enforce_report_immutability;
alter table reports enable trigger audit_report_transitions_trg;
alter table reports enable trigger reports_updated_at;

alter table reports drop constraint if exists reports_no_review_status;
alter table reports
  add constraint reports_no_review_status
  check (status <> 'resolution_pending_review');

alter table reports drop constraint if exists reports_no_verdict_type;
alter table reports
  add constraint reports_no_verdict_type
  check (type <> 'call');

-- ============================================================
-- 4. Scores
-- ============================================================
update profiles
set score = default,
    rating = default,
    tier = default,
    wilson_win_rate = null,
    profit_factor = null,
    avg_return = null,
    avg_alpha = null,
    sample_size = default
where score <> 0
   or rating <> 600
   or tier <> 'building'
   or wilson_win_rate is not null
   or profit_factor is not null
   or avg_return is not null
   or avg_alpha is not null
   or sample_size <> 0;

delete from moat_score_snapshots;

-- ============================================================
-- 5. The calls table, read-only
-- ============================================================
drop trigger if exists enforce_prediction_immutability on predictions;
drop trigger if exists enforce_prediction_no_delete on predictions;
drop trigger if exists audit_prediction_resolution_trg on predictions;
drop function if exists prevent_prediction_terms_edit();
drop function if exists prevent_prediction_delete();
drop function if exists audit_prediction_resolution();

create or replace function predictions_read_only()
returns trigger language plpgsql as $$
begin
  -- The demo purge (purge_demo_author, @stoa.demo accounts only) keeps the
  -- exception it has always had, so reseeding the demo still works.
  if TG_OP = 'DELETE' and current_setting('app.allow_prediction_delete', true) = 'true' then
    return OLD;
  end if;
  raise exception 'Calls are retired: the predictions table is a read-only archive until it is dropped.';
end;
$$;

drop trigger if exists predictions_read_only on predictions;
create trigger predictions_read_only
before insert or update or delete on predictions
for each row execute function predictions_read_only();

drop trigger if exists predictions_no_truncate on predictions;
create trigger predictions_no_truncate
before truncate on predictions
for each statement execute function predictions_read_only();

drop policy if exists predictions_insert on predictions;
revoke insert, update, delete, truncate on predictions from anon, authenticated;

comment on table predictions is
  'Retired with grading (0067). A read-only archive: no insert, update, delete or truncate. Read only as the fallback for a publication''s direction before 0065. Dropped in a later release.';

-- ============================================================
-- 6. Rules that named the review status, and the delete rule
-- ============================================================
-- Each is its latest definition (the migration named beside it) with only
-- the review status taken out.

-- 0036
drop policy if exists reports_read on reports;
create policy reports_read on reports
  for select using (
    status = 'published' or author_id = auth.uid()
  );

-- 0036
drop policy if exists predictions_read on predictions;
create policy predictions_read on predictions
  for select using (
    exists (
      select 1 from reports r
      where r.id = predictions.report_id
        and (
          r.status = 'published'
          or r.author_id = auth.uid()
        )
    )
  );

-- 0037
drop policy if exists video_read on video_assets;
create policy video_read on video_assets for select using (
  creator_id = auth.uid()
  or exists (
    select 1 from reports r
    where r.id = video_assets.report_id
      and r.status = 'published'
  )
);

-- 0037
drop policy if exists claims_read on claims;
create policy claims_read on claims
  for select using (
    exists (
      select 1 from reports r
      where r.id = claims.report_id
        and (
          r.status = 'published'
          or r.author_id = auth.uid()
        )
    )
  );

-- 0037
drop policy if exists debate_read on debate_comments;
create policy debate_read on debate_comments
  for select using (
    exists (
      select 1 from claims c
      join reports r on r.id = c.report_id
      where c.id = debate_comments.claim_id
        and (
          r.status = 'published'
          or r.author_id = auth.uid()
        )
    )
  );

-- 0051
drop policy if exists publication_cards_read on publication_cards;
create policy publication_cards_read on publication_cards
  for select using (
    exists (
      select 1 from reports r
      where r.id = publication_cards.report_id
        and (
          r.author_id = auth.uid()
          or (
            r.status = 'published'
            and (
              publication_cards.locked = false
              or public.can_read_report_body(r.id, auth.uid())
            )
          )
        )
    )
  );

-- 0063: the edit log stays readable wherever the publication is, archived
-- included. Only the review status leaves.
drop policy if exists report_edits_read on report_edits;
create policy report_edits_read on report_edits
  for select using (
    exists (
      select 1 from reports r
      where r.id = report_edits.report_id
        and (
          r.status in ('published', 'archived')
          or r.author_id = auth.uid()
        )
    )
  );

-- 0035
drop policy if exists reports_insert on reports;
create policy reports_insert on reports
  for insert with check (
    author_id = auth.uid()
    and (
      type = 'short_post'
      or status <> 'published'
      or exists (
        select 1 from profiles p
        where p.id = auth.uid() and p.role in ('analyst', 'admin')
      )
    )
  );

-- 0035
drop policy if exists reports_update on reports;
create policy reports_update on reports
  for update using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and (
      type = 'short_post'
      or status <> 'published'
      or exists (
        select 1 from profiles p
        where p.id = auth.uid() and p.role in ('analyst', 'admin')
      )
    )
  );

-- 0059
create or replace function can_read_report_body(p_report_id uuid, p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from reports r
    where r.id = p_report_id
      and (
        r.author_id = p_uid
        or (
          r.status = 'published'
          and (
            r.access = 'free'
            or (
              r.access = 'paid'
              and (
                exists (
                  select 1 from report_unlocks u
                  where u.report_id = r.id and u.user_id = p_uid
                )
                or (
                  coalesce(r.members_included, false)
                  and exists (
                    select 1 from subscriptions s
                    where s.analyst_id = r.author_id
                      and s.subscriber_id = p_uid
                      and s.status = 'active'
                      and s.renews_at > now()
                  )
                )
              )
            )
            or (
              r.access = 'subscribers'
              and exists (
                select 1 from subscriptions s
                left join plans p on p.id = s.plan_id
                where s.analyst_id = r.author_id
                  and s.subscriber_id = p_uid
                  and s.status = 'active'
                  and s.renews_at > now()
                  and coalesce(p.rank, 0) >= r.min_plan_rank
                  and public.plan_has_required_perks(p.perks, r.required_perks)
              )
            )
          )
        )
      )
  );
$$;

-- 0054
create or replace function ticker_coverage_counts()
returns table (symbol text, report_count bigint)
language sql stable set search_path = public as $$
  select upper(r.ticker) as symbol, count(*) as report_count
  from reports r
  where r.status = 'published'
    and r.ticker is not null
  group by upper(r.ticker)
  order by report_count desc;
$$;

-- 0054
create or replace function ticker_coverage_window(
  p_since timestamptz default null,
  p_until timestamptz default null
)
returns table (symbol text, report_count bigint)
language sql stable set search_path = public as $$
  select upper(r.ticker) as symbol, count(*) as report_count
  from reports r
  where r.status = 'published'
    and r.ticker is not null
    and (p_since is null or r.published_at >= p_since)
    and (p_until is null or r.published_at < p_until)
  group by upper(r.ticker)
  order by report_count desc;
$$;

-- 0056. `resolved` stays in the shape so a caller written against it still
-- works, and is always zero: nothing resolves any more, and the calls table
-- is no longer read here.
create or replace function today_activity(p_since timestamptz)
returns table (publications bigint, analysts bigint, resolved bigint)
language sql stable set search_path = public as $$
  select
    (
      select count(*)::bigint
      from reports r
      where r.status = 'published'
        and r.published_at >= p_since
    ) as publications,
    (
      select count(distinct r.author_id)::bigint
      from reports r
      where r.status = 'published'
        and r.published_at >= p_since
    ) as analysts,
    0::bigint as resolved;
$$;

-- 0034
create or replace function set_report_locked_at_on_insert()
returns trigger language plpgsql as $$
begin
  if NEW.status = 'published' and NEW.locked_at is null then
    NEW.locked_at := coalesce(NEW.published_at, now());
  end if;
  return NEW;
end;
$$;

-- 0066, without the calls check: since 0065 every call's direction is its
-- publication's stance, so the stance alone refuses exactly what it did.
create or replace function prevent_locked_report_delete()
returns trigger language plpgsql as $$
begin
  -- A draft has never been on the public record.
  if OLD.locked_at is null and OLD.status = 'draft' then
    return OLD;
  end if;

  if exists (select 1 from report_unlocks u where u.report_id = OLD.id) then
    raise exception
      'Someone has bought this publication, so it can be archived but not deleted.';
  end if;

  if OLD.stance is not null then
    raise exception
      'This publication declares a stance, so it can be archived but not deleted.';
  end if;

  -- Deletable content. The child guards read this flag so the cascade is not
  -- mistaken for an edit of locked content. Transaction-local.
  perform set_config('app.deleting_callless_report', OLD.id::text, true);
  return OLD;
end;
$$;

comment on function prevent_locked_report_delete() is
  'Refuses deletion of a published report that declares a stance or has been bought. Other published or archived reports may be deleted by their author; drafts are unchanged.';

-- 0065's index, for live publications only.
drop index if exists reports_ticker_stance_idx;
create index reports_ticker_stance_idx
  on reports (ticker, stance)
  where stance is not null and status = 'published';

-- 0019, without the score: analysts are matched, then ordered by followers.
create or replace function search_platform(p_query text, p_limit int default 5)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select nullif(trim(p_query), '') as q, greatest(1, least(coalesce(p_limit, 5), 20)) as lim
  ),
  creator_rows as (
    select
      p.id,
      p.handle,
      p.display_name,
      p.avatar_url,
      p.followers_count,
      greatest(similarity(p.handle, pr.q), similarity(p.display_name, pr.q)) as sim
    from profiles p
    cross join params pr
    where pr.q is not null
      and p.role in ('analyst', 'admin')
      and (
        p.handle % pr.q
        or p.display_name % pr.q
        or p.handle ilike '%' || pr.q || '%'
        or p.display_name ilike '%' || pr.q || '%'
      )
    order by sim desc, p.followers_count desc
    limit (select lim from params)
  ),
  ticker_rows as (
    select
      t.symbol,
      t.name as company_name,
      t.sector,
      coalesce(trc.report_count, 0) as report_count,
      greatest(similarity(t.symbol, pr.q), similarity(t.name, pr.q)) as sim
    from tickers t
    cross join params pr
    left join ticker_report_counts trc on trc.symbol = t.symbol
    where pr.q is not null
      and t.status = 'active'
      and (
        t.symbol % pr.q
        or t.name % pr.q
        or t.symbol ilike '%' || pr.q || '%'
        or t.name ilike '%' || pr.q || '%'
      )
    order by sim desc, coalesce(trc.report_count, 0) desc, t.symbol
    limit (select lim from params)
  )
  select json_build_object(
    'creators', coalesce((select json_agg(to_jsonb(c)) from creator_rows c), '[]'::json),
    'tickers', coalesce((select json_agg(to_jsonb(t)) from ticker_rows t), '[]'::json)
  )
  from params;
$$;

-- ============================================================
-- The check
-- ============================================================
do $$
declare
  v_review int;
  v_verdicts int;
  v_scored int;
  v_snapshots int;
  v_calls int;
begin
  select count(*) into v_review from reports where status = 'resolution_pending_review';
  select count(*) into v_verdicts from reports where type = 'call';
  select count(*) into v_scored from profiles
    where score <> 0 or wilson_win_rate is not null or sample_size <> 0;
  select count(*) into v_snapshots from moat_score_snapshots;
  select count(*) into v_calls from predictions;

  if v_review > 0 or v_verdicts > 0 or v_scored > 0 or v_snapshots > 0 then
    raise exception
      'Retirement incomplete: % awaiting review, % verdicts, % scored profiles, % snapshots. Nothing was changed.',
      v_review, v_verdicts, v_scored, v_snapshots;
  end if;

  raise notice 'Grading retired. % calls archived read-only; no review status, no verdicts, no scores left.', v_calls;
end;
$$;
