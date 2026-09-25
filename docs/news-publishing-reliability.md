# News Publishing Reliability

## September 11 Incident

Scheduled refreshes were starting, but seven consecutive runs after September 9 hit the 90-minute job timeout. Groq daily-quota errors were retried for each queued article. Publishing happened only after the entire review loop, so completed approvals accumulated without appearing in the app. Recovery published 166 already-approved articles; no moderation decisions were bypassed.

## Safeguards

- **Publish Approved Stories** independently drains up to 200 approvals every 30 minutes, with only Supabase credentials. It does not wait for ingestion, AI review, or the refresh workflow. GitHub may delay scheduled starts, so this is not an exact delivery-time guarantee.
- `docs/supabase_story_publication_uniqueness.sql` adds a unique source-URL index. All publishing passes use conflict-ignore inserts and reconcile existing IDs, so overlapping publishers do not duplicate stories or overwrite their content and engagement data.

- Publish existing approvals before ingestion, then publish again after review, even if either earlier stage fails.
- Give ingestion 45 minutes, review 10 minutes, each publishing pass 10 minutes, and health checks 5 minutes. The overall 100-minute job leaves setup and cleanup headroom.
- Review at most 40 candidates with a 30,000-token budget per run, reserving a conservative UTF-8-sized prompt estimate plus completion allowance before each attempt and reconciling reported usage afterward. The usual four scheduled runs budget at most 120,000 tokens in total, leaving room under the observed 200,000 daily quota. Other workloads and manual runs still share the provider quota.
- Stop review immediately on daily quota exhaustion, cooldowns over 30 seconds, the 8-minute internal time budget, or three consecutive failures. Leave unreviewed rows unchanged for later runs. Never substitute heuristic approval after a provider error.
- Short retries respect `Retry-After`. Token-per-minute reset headers are not treated as a daily-quota reset.
- A separate watchdog checks publication every two hours, regardless of the refresh job. It checks both insertion activity (24 hours) and source freshness (48 hours), plus a large approved backlog. It opens/updates one GitHub issue for a failed check and closes it when freshness recovers. Enable repository/Actions notifications to receive alerts; creating an issue alone does not guarantee an email.
- Country editions older than 72 hours are listed as coverage warnings. A sparse country is not a reason to publish negative or unverified articles. At recovery, Slovenia, Japan and Brazil still had older source stories and need coverage/heuristic investigation separate from the global publishing timeout.
- Pushes changing pipeline code trigger a validation refresh and supersede older in-progress refresh code. Regular scheduled runs do not cancel each other. GitHub scheduling can be delayed; the watchdog is independent but uses the same GitHub scheduler, not an external uptime guarantee.

## Rejected Article Retention

**Clean Up Old Rejected Articles** runs daily at 04:32 UTC, independently of AI and publication, and can be dispatched manually. It removes only `raw_articles` with `review_status = rejected`, no `published_story_id`, and `created_at` more than 14 days ago. Each deletion rechecks eligibility to protect concurrent review changes. It processes batches of 250, capped at 20,000 per run; a `capped: true` result means another pass may be needed. Database errors fail the workflow. Approved, pending and published records, stories, accounts, saved stories and subscriptions are outside its scope.

Normal PostgreSQL vacuuming makes deleted space reusable. After a large one-off cleanup, `VACUUM (FULL, ANALYZE) public.raw_articles` can shrink the physical table, but requires an exclusive lock and extra temporary disk space. Do not schedule full vacuum daily; use it as supervised maintenance. Retention is not an archive: removed rejected records can be ingested again if a source still returns them. Pending/published raw records remain unbounded and should be monitored separately.

## Operator Checks

In GitHub Actions inspect **Refresh News**, **Publish Approved Stories**, and **News Publishing Watchdog**. Quota exhaustion, rate-limit cooldowns and bounded review-budget pauses are successful partial runs: the step summary records the deferred count and reason, remaining rows stay pending, and approved rows continue to publication. Authentication, malformed responses, service outages (including HTTP 5xx cooldowns), database failures, publishing failures and stale-feed checks still fail. A real AI error earlier in a batch is not hidden by a later quota pause. Check the health step's country table before interpreting a fresh global feed as full country coverage.

For local verification with the existing private environment:

```sh
node --test tests/ingestion-runtime.test.mjs tests/publishing-queue.test.mjs tests/news-health.test.mjs tests/review-batch.test.mjs
node --env-file=.env scripts/check-news-health.mjs
```

The repair is server-side. No Android release is required.

References: [Groq rate limits](https://console.groq.com/docs/rate-limits), [GitHub workflow timeouts](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).
