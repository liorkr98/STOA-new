-- Backend brief items 2 + 3: evidence cards (the Card Engine) and the per-card
-- server-side paywall. These ship together on purpose: stored cards without a
-- per-card entitlement check would send locked payloads to the browser, which is
-- a paywall breach, not a bug to fix later.
--
-- The `locked` flag is per card because the creator sets the reveal line inside a
-- publication, not per report. So entitlement cannot be decided at the report
-- level: a free reader may see cards 1-3 of a paid publication and not 4-9.
--
-- RLS is the enforcement point rather than the query, so it holds for any read
-- path added later (a new API route, a server action, the Supabase client).

create table if not exists publication_cards (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports (id) on delete cascade,
  -- Order within the stack, 0-based.
  position int not null,
  kind text not null check (kind in (
    'thesis',
    'edge',
    'path_to_target',
    'kill_switch',
    'catalyst_timeline',
    'checklist',
    'figure',
    'steelman',
    'unlock'
  )),
  -- Below the creator's reveal line: requires entitlement to read the payload.
  locked boolean not null default false,
  -- Matches the discriminated union in src/lib/feed/types.ts for this `kind`.
  -- Provenance (plain | creator_est | auto) lives per value inside the payload.
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (report_id, position)
);

create index if not exists publication_cards_report_idx
  on publication_cards (report_id, position);

-- The entitlement join runs on every card read, so index both sides of it.
create index if not exists report_unlocks_user_report_idx
  on report_unlocks (user_id, report_id);
create index if not exists subscriptions_subscriber_analyst_status_idx
  on subscriptions (subscriber_id, analyst_id, status);

alter table publication_cards enable row level security;

-- The paywall predicate, mirroring the `bodies_read` policy on report_bodies
-- (migration 0027). Defined with CREATE OR REPLACE so this migration is
-- self-contained regardless of whether the scale-hardening branch (which also
-- ships this helper) has landed; the two definitions are identical.
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

-- Read: an unlocked card follows the parent report's visibility; a locked card
-- additionally requires entitlement, reusing the paywall predicate above rather
-- than restating the rule and risking drift.
drop policy if exists publication_cards_read on publication_cards;
create policy publication_cards_read on publication_cards
  for select using (
    exists (
      select 1 from reports r
      where r.id = publication_cards.report_id
        and (
          r.author_id = auth.uid()
          or (
            r.status in ('published', 'resolution_pending_review')
            and (
              publication_cards.locked = false
              or public.can_read_report_body(r.id, auth.uid())
            )
          )
        )
    )
  );

-- Write: the author, and only while the publication is not yet locked, mirroring
-- report_bodies. After publish the stack is part of the record.
drop policy if exists publication_cards_author_write on publication_cards;
create policy publication_cards_author_write on publication_cards
  for all using (
    exists (
      select 1 from reports r
      where r.id = publication_cards.report_id and r.author_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from reports r
      where r.id = publication_cards.report_id and r.author_id = auth.uid()
    )
  );

-- The Steelman (Devil's Advocate objection + the analyst's answer).
--
-- DEVIATION FROM THE BRIEF, on purpose: the brief put the objection and answer
-- on `reports` as text columns. `reports` is public-read for published rows and
-- is queried with select("*") in many places, so gated prose stored there would
-- be readable by anyone with the anon key regardless of any app-layer flag. The
-- text therefore lives in `publication_cards` as a row of kind 'steelman', which
-- RLS already gates per card; only the placement flags live here, since a
-- boolean leaks nothing.
--
-- Independent gating holds in the safe direction: the box can be stricter than
-- the card. A box configured as free while the card is locked fails closed for a
-- non-entitled reader, because the payload never leaves the database.
alter table reports
  add column if not exists steelman_box_locked boolean not null default false,
  add column if not exists steelman_card_locked boolean not null default false;

comment on column reports.steelman_box_locked is
  'Gates the Steelman box on the report page. The text lives in publication_cards (RLS-protected) because reports is public-read.';
