-- prevent_locked_report_edit (0012_trust_compliance.sql) protects title,
-- summary, ticker, type, access, price, and locked_at once a report is
-- locked, but content_hash (0038_report_content_hash.sql) was left out
-- entirely -- it could be silently overwritten post-lock, undermining the
-- tamper-evidence the JSON-LD Article.identifier is meant to convey. It is
-- written once, in a follow-up update after the report already locked (see
-- src/lib/reports/publish-report.ts), so the trigger must allow null -> value
-- but block any further change once set.

create or replace function prevent_locked_report_edit()
returns trigger language plpgsql as $$
begin
  if OLD.locked_at is not null then
    if NEW.title is distinct from OLD.title
       or NEW.summary is distinct from OLD.summary
       or NEW.ticker is distinct from OLD.ticker
       or NEW.type is distinct from OLD.type
       or NEW.access is distinct from OLD.access
       or NEW.price is distinct from OLD.price
       or NEW.locked_at is distinct from OLD.locked_at
       or (OLD.content_hash is not null and NEW.content_hash is distinct from OLD.content_hash)
       or (NEW.status = 'draft' and OLD.status <> 'draft') then
      raise exception 'Cannot modify a locked report''s content, pricing, ticker, content hash, or lock timestamp. Only status (archive), engagement counters, and fact_check_results are mutable after lock.';
    end if;
  end if;
  return NEW;
end;
$$;
