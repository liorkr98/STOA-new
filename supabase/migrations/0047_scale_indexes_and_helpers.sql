-- Scale-Hardening Section 5: indexes, slow-query visibility, TTL cleanup, and a
-- paywall helper. All additive and backwards-compatible.

-- Slow-query visibility. Review top statements by total time weekly during
-- growth (docs/SCALE.md). Usually already present on Supabase; harmless if so.
create extension if not exists pg_stat_statements;

-- Missing FK / common-filter indexes -----------------------------------------
create index if not exists wallet_transactions_wallet_idx
  on wallet_transactions (wallet_id);

create index if not exists subscriptions_subscriber_status_idx
  on subscriptions (subscriber_id, status);

-- Unread-badge query hits only unread rows; a partial index stays tiny.
create index if not exists notifications_unread_idx
  on notifications (recipient_id) where read = false;

create index if not exists audit_log_created_idx
  on audit_log (created_at desc);

-- Ticker discover feeds filter ticker + status, ordered by recency.
create index if not exists reports_ticker_status_published_idx
  on reports (ticker, status, published_at desc);

create index if not exists processed_webhook_events_processed_idx
  on processed_webhook_events (processed_at);

create index if not exists api_rate_limits_window_idx
  on api_rate_limits (window_start);

create index if not exists moat_score_snapshots_created_idx
  on moat_score_snapshots (created_at);

-- TTL cleanup for unbounded bookkeeping tables --------------------------------
create or replace function cleanup_api_rate_limits(p_older_than interval default interval '1 day')
returns int language plpgsql security definer set search_path = public as $$
declare v_deleted int;
begin
  delete from api_rate_limits where window_start < now() - p_older_than;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

create or replace function cleanup_processed_webhook_events(p_older_than interval default interval '30 days')
returns int language plpgsql security definer set search_path = public as $$
declare v_deleted int;
begin
  delete from processed_webhook_events where processed_at < now() - p_older_than;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- Paywall helper (mirrors the report_bodies `bodies_read` policy from 0027).
-- NOT yet wired into the policy: swapping the multi-table EXISTS policy to call
-- this must be validated on staging with the RLS suite first (a mistake here
-- leaks paid content). Provided so that swap is a one-line policy change once
-- verified. SECURITY DEFINER + stable; kept in `public` but only meaningful
-- with an explicit uid, and it never widens access beyond the current policy.
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
              and exists (
                select 1 from report_unlocks u
                where u.report_id = r.id and u.user_id = p_uid
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
