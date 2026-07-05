-- Part H: engagement & social layer. Hard rule: nothing here feeds the scoring
-- cron -- votes and polls are community sentiment, never part of a track record.
-- claim_replies from the spec is intentionally NOT created: debate_comments
-- (0013) already covers per-claim replies.

-- ── H3: polls ────────────────────────────────────────────────────────────────
create table polls (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles (id) on delete cascade,
  report_id uuid references reports (id) on delete set null,
  question text not null,
  kind text not null check (kind in ('sentiment', 'choice', 'coverage', 'target')),
  ticker text,
  min_plan_rank integer not null default 0,
  closes_at timestamptz,
  created_at timestamptz default now()
);
create index polls_creator_idx on polls (creator_id, created_at desc);
create index polls_report_idx on polls (report_id);

create table poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls (id) on delete cascade,
  label text not null,
  sort integer default 0
);
create index poll_options_poll_idx on poll_options (poll_id, sort);

create table poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls (id) on delete cascade,
  option_id uuid not null references poll_options (id) on delete cascade,
  voter_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz default now(),
  unique (poll_id, voter_id)
);
create index poll_votes_poll_idx on poll_votes (poll_id, option_id);

-- ── H2: bull/bear stance on an extracted claim ───────────────────────────────
create table claim_votes (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references claims (id) on delete cascade,
  voter_id uuid not null references profiles (id) on delete cascade,
  stance text not null check (stance in ('bull', 'bear')),
  created_at timestamptz default now(),
  unique (claim_id, voter_id)
);
create index claim_votes_claim_idx on claim_votes (claim_id, stance);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table polls enable row level security;
alter table poll_options enable row level security;
alter table poll_votes enable row level security;
alter table claim_votes enable row level security;

-- Polls: public unless plan-gated; the creator always sees their own. The
-- gated read mirrors the report_bodies plan-rank check.
create policy polls_read on polls for select using (
  creator_id = auth.uid()
  or min_plan_rank = 0
  or exists (
    select 1 from subscriptions s
    left join plans p on p.id = s.plan_id
    where s.analyst_id = polls.creator_id
      and s.subscriber_id = auth.uid()
      and s.status = 'active'
      and s.renews_at > now()
      and coalesce(p.rank, 0) >= polls.min_plan_rank
  )
);
create policy polls_insert on polls for insert with check (creator_id = auth.uid());
create policy polls_update on polls for update using (creator_id = auth.uid());
create policy polls_delete on polls for delete using (creator_id = auth.uid());

create policy poll_options_read on poll_options for select using (
  exists (select 1 from polls where polls.id = poll_options.poll_id)
);
create policy poll_options_write on poll_options for insert with check (
  exists (select 1 from polls where polls.id = poll_id and polls.creator_id = auth.uid())
);
create policy poll_options_delete on poll_options for delete using (
  exists (select 1 from polls where polls.id = poll_id and polls.creator_id = auth.uid())
);

-- Votes: tallies are public reads; one vote per user; closed polls reject votes.
create policy poll_votes_read on poll_votes for select using (true);
create policy poll_votes_insert on poll_votes for insert with check (
  voter_id = auth.uid()
  and exists (
    select 1 from polls
    where polls.id = poll_id and (polls.closes_at is null or polls.closes_at > now())
  )
);
create policy poll_votes_delete on poll_votes for delete using (voter_id = auth.uid());

create policy claim_votes_read on claim_votes for select using (true);
create policy claim_votes_insert on claim_votes for insert with check (voter_id = auth.uid());
create policy claim_votes_update on claim_votes for update using (voter_id = auth.uid());
create policy claim_votes_delete on claim_votes for delete using (voter_id = auth.uid());
