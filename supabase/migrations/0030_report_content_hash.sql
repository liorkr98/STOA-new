-- Content hash for structured data (Article.identifier). Computed in
-- application code at the end of the publish flow, not in a DB trigger:
-- the hash input spans reports (ticker), report_bodies (body), and
-- predictions (target_price, horizon_date) -- three tables written across
-- separate statements in validateAndPublishReport, so no single BEFORE
-- UPDATE trigger on `reports` can see the prediction row yet (it's inserted
-- after the report locks). See src/lib/reports/publish-report.ts.

alter table reports
  add column if not exists content_hash text;

comment on column reports.content_hash is
  'sha256 hex digest of ticker + target_price + horizon_date + body + locked_at, computed once at publish. Null for reports published before this column existed or for short posts/report shapes the hash does not yet cover -- never backfilled with a fabricated value.';
