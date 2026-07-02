-- Structured fact-checker claims + claim-scoped debate.
--
-- `reports.fact_check_results` (added in 0009) stays as a fast-read JSON summary
-- for the report card chip. This migration adds the authoritative, queryable
-- store: one row per atomic claim, with character offsets so the frontend can
-- highlight inline without re-parsing the body, and a verdict enum instead of
-- a free-text type.

create type claim_verdict as enum ('fact', 'unproven', 'opinion', 'contradicted');

create table claims (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports (id) on delete cascade,
  claim_text text not null,
  verdict claim_verdict not null,
  confidence numeric check (confidence between 0 and 1),
  note text,
  source_url text,
  char_start integer not null default 0,
  char_end integer not null default 0,
  created_at timestamptz not null default now()
);

create index claims_report_idx on claims (report_id);
create index claims_verdict_idx on claims (report_id, verdict);

-- Claims freeze the moment the parent report locks — matches the same
-- append-only guarantee as the report body and the price-target lock.
create or replace function prevent_claim_edit_if_report_locked()
returns trigger language plpgsql as $$
declare v_locked timestamptz;
begin
  select locked_at into v_locked from reports where id = coalesce(NEW.report_id, OLD.report_id);
  if v_locked is not null then
    raise exception 'Cannot modify fact-check claims on a locked report.';
  end if;
  return coalesce(NEW, OLD);
end;
$$;

create trigger enforce_claims_immutability
before update or delete on claims
for each row execute function prevent_claim_edit_if_report_locked();

alter table claims enable row level security;

-- Readable by anyone who can read the parent report (published, or the author).
create policy claims_read on claims
  for select using (
    exists (
      select 1 from reports r
      where r.id = claims.report_id
        and (r.status = 'published' or r.author_id = auth.uid())
    )
  );

-- Only the report's author can write claims, and only while the report is
-- still a draft (the trigger above enforces the post-lock freeze too, but
-- checking here fails fast with a clean policy violation instead of a raise).
create policy claims_insert on claims
  for insert with check (
    exists (
      select 1 from reports r
      where r.id = claims.report_id and r.author_id = auth.uid() and r.locked_at is null
    )
  );

create policy claims_update on claims
  for update using (
    exists (
      select 1 from reports r
      where r.id = claims.report_id and r.author_id = auth.uid() and r.locked_at is null
    )
  );

create policy claims_delete on claims
  for delete using (
    exists (
      select 1 from reports r
      where r.id = claims.report_id and r.author_id = auth.uid() and r.locked_at is null
    )
  );

-- ============================================================
-- Debate comments — scoped to a single claim, opinion-tier only
-- ============================================================
create table debate_comments (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references claims (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index debate_claim_idx on debate_comments (claim_id, created_at);

alter table debate_comments enable row level security;

-- Readable by anyone who can read the parent claim/report.
create policy debate_read on debate_comments
  for select using (
    exists (
      select 1 from claims c
      join reports r on r.id = c.report_id
      where c.id = debate_comments.claim_id
        and (r.status = 'published' or r.author_id = auth.uid())
    )
  );

-- Insertable by any authenticated user, but only on claims verdict = 'opinion'.
-- (Defense-in-depth: the primary UX-level explanation belongs server-side in
-- the API layer, but RLS checking the claim's verdict via subquery means a
-- direct client insert can't bypass the opinion-only restriction either.)
create policy debate_insert on debate_comments
  for insert with check (
    author_id = auth.uid()
    and exists (select 1 from claims c where c.id = claim_id and c.verdict = 'opinion')
  );

create policy debate_delete on debate_comments
  for delete using (author_id = auth.uid());
