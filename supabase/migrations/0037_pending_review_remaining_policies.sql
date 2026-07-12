-- 0036_resolution_pending_visibility fixed reports_read, predictions_read, and
-- bodies_read so a report stuck in resolution_pending_review (grade.ts, when a
-- call's horizon closes with no market price yet) stays visible exactly as it
-- was before the status flip. video_read (0023_research_platform.sql),
-- claims_read, and debate_read (0013_claims_debate.sql) gate on the same
-- report and were missed -- so a paying subscriber's video/audio, fact-check
-- claims, and debate thread would still vanish for a report the reader is
-- otherwise fully entitled to see. Same status set, same reasoning.

drop policy if exists video_read on video_assets;
create policy video_read on video_assets for select using (
  creator_id = auth.uid()
  or exists (
    select 1 from reports r
    where r.id = video_assets.report_id
      and r.status in ('published', 'resolution_pending_review')
  )
);

drop policy if exists claims_read on claims;
create policy claims_read on claims
  for select using (
    exists (
      select 1 from reports r
      where r.id = claims.report_id
        and (
          r.status in ('published', 'resolution_pending_review')
          or r.author_id = auth.uid()
        )
    )
  );

drop policy if exists debate_read on debate_comments;
create policy debate_read on debate_comments
  for select using (
    exists (
      select 1 from claims c
      join reports r on r.id = c.report_id
      where c.id = debate_comments.claim_id
        and (
          r.status in ('published', 'resolution_pending_review')
          or r.author_id = auth.uid()
        )
    )
  );
