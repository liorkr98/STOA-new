-- Research-platform foundation (spec v3, Appendix 1). Unblocks Part C (plans &
-- monetization), Part D (video), Part F (notebook), Part E (versioning), and the
-- A8 image upload bucket. Additive: existing wallet/subscription flows keep
-- working; the paywall change is backward-compatible (min_plan_rank defaults 0).

-- ── Part C: plans, coupons, per-plan gating ──────────────────────────────────
create table plans (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null default 0,
  interval text not null default 'month' check (interval in ('month', 'year')),
  rank integer not null,
  perks jsonb not null default '[]',
  trial_days integer default 0,
  is_archived boolean default false,
  created_at timestamptz default now()
);
create index plans_creator_rank_idx on plans (creator_id, rank);

create table coupons (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references profiles (id) on delete cascade,
  code text not null,
  percent_off int,
  months int,
  max_redemptions int,
  redeemed int default 0,
  expires_at timestamptz,
  created_at timestamptz default now()
);
create unique index coupons_creator_code_idx on coupons (creator_id, lower(code));

-- Link a subscription to the plan it was bought on (null = legacy single-tier).
alter table subscriptions add column if not exists plan_id uuid references plans (id);

-- The minimum plan rank required to read a report body (0 = any subscriber /
-- the report's own access rule). Enables per-report and per-block gating.
alter table reports add column if not exists min_plan_rank integer not null default 0;

-- ── Part D: video assets ─────────────────────────────────────────────────────
create table video_assets (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references profiles (id) on delete cascade,
  report_id uuid references reports (id) on delete set null,
  provider text default 'cloudflare',
  playback_id text,
  poster_url text,
  duration_s numeric,
  aspect_ratio text,
  transcript jsonb,
  chapters jsonb,
  status text default 'processing',
  created_at timestamptz default now()
);
create index video_assets_creator_idx on video_assets (creator_id, created_at desc);
create index video_assets_report_idx on video_assets (report_id);

-- ── Part F: notebooks ────────────────────────────────────────────────────────
create table notebooks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  created_at timestamptz default now()
);
create index notebooks_owner_idx on notebooks (owner_id, created_at desc);

create table notebook_entries (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references notebooks (id) on delete cascade,
  kind text not null, -- 'snippet' | 'figure' | 'chart' | 'kpi' | 'report' | 'note'
  payload jsonb not null,
  source jsonb, -- { url, title, accession, ticker, asOf }
  tags text[] default '{}',
  color text,
  created_at timestamptz default now()
);
create index notebook_entries_notebook_idx on notebook_entries (notebook_id, created_at desc);

-- ── Part E: report version history (publish still locks permanently) ─────────
create table report_versions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  title text,
  body text,
  created_at timestamptz default now()
);
create index report_versions_report_idx on report_versions (report_id, created_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table plans enable row level security;
alter table coupons enable row level security;
alter table video_assets enable row level security;
alter table notebooks enable row level security;
alter table notebook_entries enable row level security;
alter table report_versions enable row level security;

-- Plans are public (the storefront shows them); the creator manages their own.
create policy plans_read on plans for select using (true);
create policy plans_insert on plans for insert with check (creator_id = auth.uid());
create policy plans_update on plans for update using (creator_id = auth.uid());
create policy plans_delete on plans for delete using (creator_id = auth.uid());

-- Coupons are creator-private; buyer redemption goes through a SECURITY DEFINER
-- RPC (to be added with the checkout flow) rather than a public table read.
create policy coupons_owner on coupons for all
  using (creator_id = auth.uid()) with check (creator_id = auth.uid());

-- Video rows: creator manages; readable when linked report is published (actual
-- playback is gated by a signed token from /api/video/token).
create policy video_read on video_assets for select using (
  creator_id = auth.uid()
  or exists (
    select 1 from reports r where r.id = video_assets.report_id and r.status = 'published'
  )
);
create policy video_insert on video_assets for insert with check (creator_id = auth.uid());
create policy video_update on video_assets for update using (creator_id = auth.uid());
create policy video_delete on video_assets for delete using (creator_id = auth.uid());

-- Notebooks + entries: strictly owner-private.
create policy notebooks_owner on notebooks for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy entries_owner on notebook_entries for all
  using (
    exists (select 1 from notebooks n where n.id = notebook_entries.notebook_id and n.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from notebooks n where n.id = notebook_entries.notebook_id and n.owner_id = auth.uid())
  );

-- Report versions: author-private.
create policy versions_owner on report_versions for all
  using (author_id = auth.uid()) with check (author_id = auth.uid());

-- ── Extend the paywall: subscriber access now respects min_plan_rank ─────────
-- Backward-compatible: min_plan_rank defaults 0, so any active subscription
-- still passes exactly as before. When a report (or block) sets a higher rank,
-- the subscriber's plan rank must meet it.
drop policy if exists bodies_read on report_bodies;
create policy bodies_read on report_bodies
  for select using (
    exists (
      select 1 from reports r
      where r.id = report_bodies.report_id
        and (
          r.author_id = auth.uid()
          or (
            r.status = 'published'
            and (
              r.access = 'free'
              or (
                r.access = 'paid'
                and exists (
                  select 1 from report_unlocks u
                  where u.report_id = r.id and u.user_id = auth.uid()
                )
              )
              or (
                r.access = 'subscribers'
                and exists (
                  select 1 from subscriptions s
                  left join plans p on p.id = s.plan_id
                  where s.analyst_id = r.author_id
                    and s.subscriber_id = auth.uid()
                    and s.status = 'active'
                    and s.renews_at > now()
                    and coalesce(p.rank, 0) >= r.min_plan_rank
                )
              )
            )
          )
        )
    )
  );

-- ── Plan-aware subscribe (atomic, 90/10 split, free tier + trial aware) ──────
create or replace function subscribe_to_plan(p_plan_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_buyer uuid := auth.uid();
  v_plan plans%rowtype;
  v_price numeric(10, 2);
  v_cut numeric(12, 2);
  v_share numeric(12, 2);
  v_buyer_wallet wallets%rowtype;
  v_author_wallet_id uuid;
  v_period interval;
begin
  if v_buyer is null then raise exception 'not authenticated'; end if;

  select * into v_plan from plans where id = p_plan_id;
  if not found then raise exception 'plan not found'; end if;
  if v_plan.is_archived then raise exception 'plan is archived'; end if;
  if v_buyer = v_plan.creator_id then raise exception 'cannot subscribe to yourself'; end if;

  v_price := round(v_plan.price_cents / 100.0, 2);
  v_period := case when v_plan.interval = 'year' then interval '365 days' else interval '30 days' end;

  -- Free tier (rank 0 / price 0): grant access, no wallet movement.
  if v_price <= 0 then
    insert into subscriptions (subscriber_id, analyst_id, status, price, plan_id, renews_at)
    values (v_buyer, v_plan.creator_id, 'active', 0, p_plan_id, now() + v_period)
    on conflict (subscriber_id, analyst_id) do update
      set status = 'active', price = 0, plan_id = excluded.plan_id,
          started_at = now(), renews_at = excluded.renews_at;
    return jsonb_build_object('status', 'subscribed', 'spent', 0, 'plan', v_plan.name);
  end if;

  -- Free trial (first-time subscriber only): grant now, defer the first charge.
  if coalesce(v_plan.trial_days, 0) > 0
     and not exists (
       select 1 from subscriptions
       where subscriber_id = v_buyer and analyst_id = v_plan.creator_id
     ) then
    insert into subscriptions (subscriber_id, analyst_id, status, price, plan_id, renews_at)
    values (v_buyer, v_plan.creator_id, 'active', v_price, p_plan_id,
            now() + (v_plan.trial_days || ' days')::interval);
    return jsonb_build_object('status', 'trial', 'trial_days', v_plan.trial_days, 'plan', v_plan.name);
  end if;

  select * into v_buyer_wallet from wallets where owner_id = v_buyer for update;
  if v_buyer_wallet.balance < v_price then raise exception 'insufficient balance'; end if;

  v_cut := round(v_price * 0.10, 2);
  v_share := v_price - v_cut;

  update wallets set balance = balance - v_price where owner_id = v_buyer;
  select id into v_author_wallet_id from wallets where owner_id = v_plan.creator_id for update;
  update wallets set balance = balance + v_share, earnings = earnings + v_share
    where id = v_author_wallet_id;

  insert into wallet_transactions (wallet_id, owner_id, type, amount, related_id, memo)
  values (v_buyer_wallet.id, v_buyer, 'subscription', -v_price, v_plan.creator_id, v_plan.name || ' subscription');
  insert into wallet_transactions (wallet_id, owner_id, type, amount, related_id, memo)
  values (v_author_wallet_id, v_plan.creator_id, 'payout', v_share, v_plan.creator_id, 'Subscription (90%)');

  insert into subscriptions (subscriber_id, analyst_id, status, price, plan_id, renews_at)
  values (v_buyer, v_plan.creator_id, 'active', v_price, p_plan_id, now() + v_period)
  on conflict (subscriber_id, analyst_id) do update
    set status = 'active', price = v_price, plan_id = excluded.plan_id,
        started_at = now(), renews_at = excluded.renews_at;

  insert into notifications (recipient_id, actor_id, kind, body, link)
  values (v_plan.creator_id, v_buyer, 'subscribe', 'You have a new subscriber', null);

  return jsonb_build_object(
    'status', 'subscribed',
    'spent', v_price,
    'platform_fee', v_cut,
    'author_share', v_share,
    'plan', v_plan.name,
    'new_balance', v_buyer_wallet.balance - v_price
  );
end;
$$;
grant execute on function subscribe_to_plan(uuid) to authenticated;

-- ── Storage: report body images (A8 imageNode) ───────────────────────────────
insert into storage.buckets (id, name, public)
values ('report-images', 'report-images', true)
on conflict (id) do nothing;

create policy "public read report-images" on storage.objects
  for select using (bucket_id = 'report-images');
create policy "own upload report-images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'report-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own update report-images" on storage.objects
  for update to authenticated
  using (bucket_id = 'report-images' and (storage.foldername(name))[1] = auth.uid()::text);
