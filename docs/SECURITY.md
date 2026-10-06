# Security and privacy

Engineering notes for Stoa's data lock, website privacy, and ops checks. Binding Terms and Privacy stay counsel's job (`docs/LEGAL_COMPLIANCE_BRIEF.md`).

## What shipped in 0068–0071

- Privileged `SECURITY DEFINER` functions are no longer executable by `anon` or (except documented RPCs) `authenticated`. `pseudonymize_user`, `upsert_paypal_account`, `purge_all_except_email`, `approve_deletion_request`, and demo `top_up` are `service_role` only.
- Partition children of `video_view_events` and `engagement_events` have RLS enabled and the parent policies copied onto each child (0070). New months get the same treatment in `create_*_partition`.
- Users can insert their own `deletion_requests` row. They cannot approve it.
- `pseudonymize_user` blanks identity, PayPal, notifications, follows, drafts, contact text, comments, debate, and consent IPs. Locked published calls stay under `deleted_xxxxxxxx`.
- Demo `top_up` / `top_up_idem` raise. Production money is PayPal.

## Cookies and tracking

- Essential: Supabase session, consent choice.
- Optional: Sentry Session Replay, only after "Accept" on the cookie banner (`hasAnalyticsConsent()`). Errors may still go to Sentry without replay, with emails and auth cookies stripped (`src/lib/sentry/before-send.ts`).

## Retention (counsel must sign off before auto-drop)

| Store | Default keep | How to drop |
| ----- | ------------ | ----------- |
| `video_view_events` monthly partitions | 13 months | `drop_old_video_view_partitions(13)` exists; maintenance cron does **not** call it yet |
| Sentry | vendor default | Sentry project settings |
| Slack alerts | channel retention | Slack workspace |
| Bunny assets | while the clip row exists | delete via Bunny API when a draft is purged |

## Bunny

- Webhook is fail-closed: missing `BUNNY_STREAM_WEBHOOK_SECRET` returns 503.
- Playback URLs stay unsigned unless `BUNNY_TOKEN_KEY` is set **and** token authentication is on in the Bunny pull zone. Recommendation: turn that on for paid/unlisted clips. Public Feed teasers can stay unsigned.

## Secrets (never `NEXT_PUBLIC_*` except anon key and Sentry DSN)

Owners: founder. Rotate on suspected paste into chat, and on a routine cadence.

- `SUPABASE_SERVICE_ROLE_KEY`, DB password
- PayPal client/secret + webhook id
- Bunny library API key, webhook secret, optional token key
- Upstash Redis/QStash
- `CRON_SECRET`, Slack tokens
- `SENTRY_AUTH_TOKEN` (build), `NEXT_PUBLIC_SENTRY_DSN` (public)

## Vercel Firewall

Enable the project firewall and a rate-limit on `/api/*` (Project → Firewall). RLS on `report_bodies` remains the paywall.

## Auth dashboard (founder)

Turn on leaked-password protection: Supabase → Authentication → Attack protection → HaveIBeenPwned.

## PITR drill (not yet timed)

1. In the Supabase dashboard, note a timestamp a few minutes ago.
2. Create a scratch project in the same region.
3. Restore the production PITR snapshot into it.
4. Check row counts on `reports`, `predictions`, `wallet_transactions`, `profiles`; spot-check one locked call and one wallet.
5. Time the restore. Delete the scratch project.

Recorded RTO: pending first drill.

## Immutability (verified in code)

Triggers `prevent_locked_report_edit` / `prevent_locked_report_delete` / `predictions_read_only` remain after the grading retirement. RLS tests assert a locked ticker cannot be rewritten by the author.

## Advisor leftovers (intentional)

- `can_read_report_body` and `increment_views` stay executable by `anon`: the paywall predicate and public view counter.
- Signed-in DEFINER RPCs (`purchase_report_idem`, `ensure_user_profile`, `approve_analyst_application`, and similar) stay callable by `authenticated`; each body checks `auth.uid()` or admin role. `check_rate_limit` namespaces keys to `auth.uid()` so one user cannot spend another user's quota.
- Tables with RLS and no policies (`api_rate_limits`, `money_idempotency`, `processed_webhook_events`) are fail-closed: only `service_role` (which bypasses RLS) reads them.
- `platform_stats` is a public materialized view on purpose.
- `pg_trgm` in `public` is pre-existing; do not move it in this batch.
- Leaked-password protection is a Supabase Auth dashboard toggle (founder).

## Dependabot / npm audit

Weekly Dependabot is already on. High/critical Next.js advisories should be bumped in a dedicated upgrade PR (do not mix with this lockdown). Recorded at ship time: `npm audit` still reports Next.js and proxy-addr issues; they are not patched here.

## Independent review

After this lockdown lands, run a security review on the hardening diff (grants, webhook fail-closed, consent-gated Replay, CSP, erasure).
