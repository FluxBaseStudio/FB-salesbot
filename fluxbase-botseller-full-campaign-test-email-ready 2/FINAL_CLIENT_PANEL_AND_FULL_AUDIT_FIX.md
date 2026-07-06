# Final client panel and full audit fix

## What was corrected

1. Client portal no longer uses the old hardcoded warm-up sequence `[5, 10, 15, ... 50]`.
2. Client portal now reads `campaign.warmup_daily_limits` from the campaign returned by `/api/client-portal/data`.
3. Client portal no longer falls back to a fake `50` daily limit in monthly limit previews.
4. If a campaign has no configured daily/warm-up limit, the client portal displays a missing configuration state instead of inventing a number.
5. The campaign preview in the admin panel no longer assumes `06:00-16:00` when work hours are empty.
6. Bot live status in admin no longer assumes `06:00-16:00` when work hours are missing. It shows a configuration error.
7. Public landing text was updated to describe campaign-configured windows and manual warm-up schedule instead of fixed `06:00-16:00` / hardcoded warm-up examples.

## Verified

- `npm run build` passes successfully.
- The scheduler remains sequential: one due campaign per default cron tick.
- One campaign cycle still searches at most one lead and creates at most one queued/draft email.
- Campaign work hours and warm-up values are taken from the campaign configuration.
