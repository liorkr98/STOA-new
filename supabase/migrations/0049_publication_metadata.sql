-- Backend brief item 1: publication metadata (tags, theme tag, scheduling).
--
-- The tag taxonomy moves from src/lib/tags/taxonomy.ts into a reference table so
-- the closed list is enforced by the database and can gain a tag without a code
-- deploy. `reports.primary_tag` drives discovery placement; `secondary_tags` are
-- searchable only (max 2, so 3 total per the frontend's TAG_LIMITS).
--
-- Content flags (has_video / has_call / has_thesis / has_cards) are deliberately
-- NOT stored: every read path already joins the clip, the prediction and the body,
-- so deriving them at read time is both cheaper than maintaining four denormalised
-- booleans and immune to drift. See docs/BACKEND_BRIEF.md item 1.

create table if not exists publication_tags (
  slug text primary key,
  label text not null,
  group_key text not null,
  -- Sector name in `tickers.sector` this tag maps to, for auto-fill from a call.
  sector text,
  sort_order int not null default 0,
  active boolean not null default true
);

alter table publication_tags enable row level security;

-- The taxonomy is public reference data; only admins may change it.
drop policy if exists publication_tags_read on publication_tags;
create policy publication_tags_read on publication_tags for select using (true);

drop policy if exists publication_tags_admin_write on publication_tags;
create policy publication_tags_admin_write on publication_tags
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Seed from src/lib/tags/taxonomy.ts. Keep the two in sync; the table wins.
insert into publication_tags (slug, label, group_key, sector, sort_order) values
  ('semiconductors', 'Semiconductors', 'sectors', 'Semiconductors', 10),
  ('software', 'Software', 'sectors', 'Software', 20),
  ('internet', 'Internet', 'sectors', 'Internet', 30),
  ('hardware', 'Hardware', 'sectors', 'Hardware', 40),
  ('financials', 'Financials', 'sectors', 'Financials', 50),
  ('healthcare', 'Healthcare', 'sectors', 'Healthcare', 60),
  ('consumer', 'Consumer', 'sectors', 'Consumer', 70),
  ('energy', 'Energy', 'sectors', 'Energy', 80),
  ('industrials', 'Industrials', 'sectors', 'Industrials', 90),
  ('materials', 'Materials', 'sectors', 'Materials', 100),
  ('media', 'Media', 'sectors', 'Media', 110),
  ('autos', 'Autos', 'sectors', 'Autos', 120),
  ('ai-buildout', 'AI buildout', 'themes', null, 210),
  ('memory', 'Memory', 'themes', null, 220),
  ('grid-capex', 'Grid capex', 'themes', null, 230),
  ('obesity-drugs', 'Weight-loss drugs', 'themes', null, 240),
  ('payments', 'Payments rails', 'themes', null, 250),
  ('energy-transition', 'Energy transition', 'themes', null, 260),
  ('defense', 'Defense', 'themes', null, 270),
  ('space', 'Space', 'themes', null, 280),
  ('rates', 'Rates', 'macro', null, 310),
  ('fx', 'FX', 'macro', null, 320),
  ('oil-energy', 'Oil & energy', 'macro', null, 330),
  ('inflation', 'Inflation', 'macro', null, 340),
  ('geopolitics', 'Geopolitics', 'macro', null, 350),
  ('china', 'China', 'macro', null, 360),
  ('israel', 'Israel', 'macro', null, 370),
  ('credit', 'Credit', 'macro', null, 380),
  ('earnings', 'Earnings', 'formats', null, 410),
  ('valuation', 'Valuation', 'formats', null, 420),
  ('technicals', 'Technicals', 'formats', null, 430),
  ('short-thesis', 'Short thesis', 'formats', null, 440),
  ('event-driven', 'Event-driven', 'formats', null, 450),
  ('ipo', 'IPO / new listing', 'formats', null, 460)
on conflict (slug) do update
  set label = excluded.label,
      group_key = excluded.group_key,
      sector = excluded.sector,
      sort_order = excluded.sort_order;

-- Publication metadata columns ------------------------------------------------
alter table reports
  add column if not exists primary_tag text references publication_tags (slug),
  add column if not exists secondary_tags text[] not null default '{}',
  add column if not exists theme_tag text references publication_tags (slug),
  add column if not exists scheduled_for timestamptz;

-- Secondary tags: at most 2, no duplicate of the primary, all in the taxonomy.
-- A trigger rather than a CHECK because validating array membership against a
-- table is not immutable.
create or replace function validate_report_tags()
returns trigger language plpgsql set search_path = public as $$
declare
  v_unknown text;
begin
  if array_length(new.secondary_tags, 1) > 2 then
    raise exception 'at most 2 secondary tags (got %)', array_length(new.secondary_tags, 1);
  end if;

  if new.primary_tag is not null and new.primary_tag = any(new.secondary_tags) then
    raise exception 'secondary tags may not repeat the primary tag';
  end if;

  if new.secondary_tags is not null and array_length(new.secondary_tags, 1) > 0 then
    select s into v_unknown
    from unnest(new.secondary_tags) as s
    where not exists (select 1 from publication_tags t where t.slug = s)
    limit 1;
    if v_unknown is not null then
      raise exception 'unknown tag slug: %', v_unknown;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists reports_validate_tags on reports;
create trigger reports_validate_tags
  before insert or update of primary_tag, secondary_tags on reports
  for each row execute function validate_report_tags();

-- Discovery placement filters on primary_tag for published rows.
create index if not exists reports_primary_tag_idx
  on reports (primary_tag, status, published_at desc)
  where primary_tag is not null;

-- Secondaries are searchable-only, so a GIN index on the array is enough.
create index if not exists reports_secondary_tags_idx
  on reports using gin (secondary_tags);

-- Scheduled publishing: the due-scan wants only pending rows.
create index if not exists reports_scheduled_for_idx
  on reports (scheduled_for)
  where scheduled_for is not null and status = 'draft';
