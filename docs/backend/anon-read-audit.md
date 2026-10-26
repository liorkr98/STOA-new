# What an anonymous visitor can read (audit, 2026-10-18)

**For Krisi.** Bar's question: what can someone with no account read at all? The anon key is in
every page, so anything below is one `curl` away for anyone, regardless of what the site shows.

**How this was measured:** every table and view in the API schema was queried read-only with
the anon key (`select=*`, exact count), against production, on 2026-10-18. Row counts are
"anon sees / rows in table". Functions (RPCs) were **not called**, because several write; they
are listed from the migrations for you to check.

61 tables and views: 41 return nothing to anon, 20 return rows, none refuse outright.

## Fix first

**Work this list in order; the order is deliberate.** Item 1 ranks first because it is reading
behaviour tied to named accounts on a research product: what someone reads here can reveal
what they are researching, buying or worried about, and it should never be public.

1. **Who read and liked what.** `report_views` (1,422 rows on 2026-10-26, `viewer_id` per
   view) and `likes` (`user_id` per like) are fully readable: anyone can list every
   publication a given account has opened, and when. Recommendation: no anon read on
   `report_views`; `likes` as counts only.
2. **Reader privacy on `profiles`.** All 57 profiles, including the 14 plain reader accounts,
   expose `marketing_opt_in`, `marketing_opt_in_at`, `age_attested_at`, `referred_by` and
   `profile_config`, and the retired scoring columns (`score`, `rating`, `tier`,
   `wilson_win_rate`, `profit_factor`, `avg_return`, `avg_alpha`, `sample_size`): "no public
   scoring" holds on screen but not in the API. Recommendation: column grants for anon limited
   to what a public profile shows (`id, handle, display_name, role, avatar_url, cover_url, bio,
   headline, followers_count, verified, created_at`).
3. **Clip media links.** `video_clips` returns every published clip's Bunny guid and
   playback, poster, preview and caption URLs (117 rows). **Fixed by migration
   `0069_clip_media_server_only.sql`**, written and rehearsed in PGlite: anon and
   authenticated lose SELECT on those five columns only. The code that reads around it is on
   main since 2026-10-18, so 0069 can be applied now; still readable on 2026-10-26.

## Readable by design, worth a decision

| Table | Anon sees | What is exposed | Note |
|---|---|---|---|
| `reports` | 479 / 1,916 | all published rows, every access level, incl. `video_edit`, `fact_check_results`, compensation fields | titles and summaries are the public teaser; `video_edit` (2 rows) carries overlay payloads |
| `report_bodies` | 259 / 1,877 | free reports' bodies only | checked: 0 paid or subscriber bodies readable |
| `publication_cards` | 648 / 2,317 | unlocked cards, and locked cards on free reports | checked: all 68 locked rows anon can read belong to free reports, which `can_read_report_body` opens to everyone, as the site does |
| `comments` | 3,924 / 3,924 | every comment with `author_id` | public on screen today |
| `follows` | 173 / 173 | the whole follow graph | |
| `predictions` | 294 / 1,128 | archived calls | read-only archive since 0067 |
| `report_edits` | 1 / 2 | before/after titles and decks | the public EDITED log |
| `plans` | 2 / 2 | analyst plan prices and perks | pricing is public |
| `publication_tags`, `ticker_report_counts`, `tickers`, `company_financials`, `platform_stats`, `dispatch_meta`, `legal_documents` | all | reference data | fine |
| `feature_flags` | 1 / 1 | flag names and states | low risk; names reveal unreleased work |

Under `FEATURE_GATED_SITE=on` the site stops showing most of this to visitors, but the API
still answers. The wall is only as strong as these policies.

## Functions to check (not called)

Postgres lets PUBLIC execute a function unless that is revoked, and a `security definer`
function runs with its owner's rights. These are definer functions in the migrations with no
`revoke ... from public` found next to them: `increment_views` (an anonymous caller can inflate
view counts), `expire_subscriptions`, `can_read_report_body`, `cleanup_api_rate_limits`,
`cleanup_money_idempotency`, `cleanup_engagement_events`, `cleanup_processed_webhook_events`.
`bump_dispatch_issue` is granted to anon explicitly and advances the Dispatch issue number.
Please confirm each one's `EXECUTE` grants in the dashboard: this list was read from migration
files, not from the live database.

## Storage

`avatars` and `covers` stay public (shown to everyone by design). `demo-clips`, `report-images`
and `chart-snapshots` become private when `fix/media-exposure` is live; `report-audio` already
is.
