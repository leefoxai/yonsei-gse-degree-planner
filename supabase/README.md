# Visitor statistics

Project: candate (wfbyuqkkcareqkcqkkcp). Function: gse-visitor-stats.

Collection starts 2026-10-01. Total is the sum of daily distinct browser visits (a returning browser adds one again on each new day); Today is distinct browsers visiting on the current Asia/Seoul date. Reloads and retries are idempotent. Clearing browser storage or switching browsers creates a new visitor; these are not verified people counts. Old iCount totals are unavailable and are not imported.

The client stores a random UUID under gse-degree-planner-visitor-v1. Only this UUID is submitted. The function stores its SHA-256 hash, first day, last day and accumulated visit-day count in the private gse_analytics schema. No names, grades or calculator contents are submitted. With unavailable localStorage the client only reads counts.

The Edge Function validates the publishable apikey in its handler, so deploy with verify_jwt=false. It reads SUPABASE_PUBLISHABLE_KEYS and SUPABASE_SECRET_KEYS from server environment; never put secret keys in frontend code. Only service_role can execute the RPC or access the table. RLS has no browser policies by design.

gse-visitor-stats-setup.sql is an archive of the applied setup, not a repeatable migration. Do not re-run it on the existing project. gse-total-daily-visits.sql archives the subsequent change to cumulative daily visits. Run tests/visitor_stats_database.sql to check first visits, same-day retries and returning visits on a new day in a rolled-back transaction. Deploy index.ts when changing the function.

Public keys and Origin checks do not prevent scripted fake visits. This counter is informational, not an audited analytics system. A source sync from yonsei-gse-calculator may overwrite visitor-stats.js/mobile.js; preserve this integration when syncing.
