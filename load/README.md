# Load tests (k6)

Scale-Hardening Section 4. Run these against a **staging** environment sized like
production (staging Supabase + a Vercel preview/staging deploy), not a laptop and
not production. Establish the ceiling before real traffic finds it.

## Install

```
brew install k6        # macOS
# or see https://k6.io/docs/get-started/installation/
```

## Run

```
BASE_URL=https://staging.stoamarket.ai k6 run load/k6.js
```

Optional scenario selection:

```
BASE_URL=... k6 run --env SCENARIO=feed load/k6.js
```

## Thresholds (defined up front, not after)

- Warm-cache p95 latency < 400ms on read endpoints.
- Error rate < 0.1%.
- No Postgres connection-pool exhaustion (watch Supabase dashboard during the run).

A run that breaches a threshold fails (non-zero exit), so it is CI-gateable.

## Scenarios

- `feed` - dispatch pagination under concurrent scroll (500-1000 VUs).
- `quote` - `/api/market/quote` burst on one hot symbol (viral-video pattern).
- `search` - typeahead burst.
- `trackView` - view-event flood on one video.

## Not covered here

`purchase_report` concurrency (race-condition check) runs as a server action
behind auth, so it needs authenticated session cookies. Script it separately with
seeded demo users and their tokens once staging exists; assert no double-charge
by checking `wallet_transactions` after a burst of retries sharing one
`client_request_id` (the money-idempotency guarantee from migration 0046).
