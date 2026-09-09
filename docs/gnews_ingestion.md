# GNews Ingestion

This app should keep reading from Supabase on the client.
Real news ingestion happens server-side through scripts.

## Required env vars

Add these to your local `.env`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` is required because the scripts write directly to your database.

## Optional source env vars

```env
GNEWS_API_KEY=your-gnews-api-key
NEWSDATA_API_KEY=your-newsdata-api-key
```

`GDELT` does not require an API key for DOC 2.0 requests.

## Run locally

```bash
npm run ingest:gnews
npm run ingest:gdelt
npm run ingest:google-news-rss
npm run ingest:newsdata
npm run ingest:rss
npm run review:pending
npm run publish:approved
npm run refresh:news
```

## What it does

- `ingest:gnews`
  - fetches candidate articles from GNews for multiple regions
  - defaults to all configured regions unless `INGEST_REGION_CODES` is set
  - uses category-specific search queries
  - supports larger batch sizes and pagination through `INGEST_GNEWS_MAX_RESULTS` and `INGEST_GNEWS_PAGES`
  - stores them in `public.raw_articles`
  - runs deterministic blocklist / heuristic filtering first
  - marks clearly bad-fit content as `rejected`
  - leaves the rest as `pending`
- `ingest:gdelt`
  - fetches open article feeds from GDELT DOC 2.0 with no API key required
  - queries a category and region matrix, then normalizes those RSS items into the BrightNews raw article shape
  - batch size is tunable with `INGEST_GDELT_MAX_RECORDS`
  - feeds candidates into the same review and publish pipeline as the other sources
- `ingest:google-news-rss`
  - fetches localized Google News RSS headline feeds for each configured region
  - requires no API key
  - helps widen regional coverage when paid/news APIs are limited
  - strips the Google source suffix from headlines and retries transient fetch failures
  - uses the same review and publish pipeline as the other sources
- `ingest:newsdata`
  - fetches candidate articles from NewsData.io's latest endpoint using the same category and region matrix
  - uses `country`, `language`, and localized keyword queries for stronger national/local coverage
  - supports pagination through `INGEST_NEWSDATA_PAGES`
  - optionally uses `timeframe` when your NewsData plan supports it
  - stores candidates in `public.raw_articles` for the same review/publish flow
- `ingest:rss`
  - fetches curated positive-news RSS feeds directly
  - now continues if one RSS feed fails instead of aborting the entire RSS run
  - supports per-feed caps through `INGEST_RSS_MAX_ITEMS_PER_FEED`
  - maps source tags into BrightNews categories and regions
- `review:pending`
  - sends pending candidate stories to Groq for a final uplifting/not-uplifting decision
  - updates category and region if the model gives a better fit
  - only approved rows are eligible for publication
- `publish:approved`
  - reads `raw_articles` with `review_status = 'approved'`
  - inserts them into `public.stories`
  - marks them as `published`
  - enforces a live feed cap through `MAX_PUBLISHED_STORIES`
  - prunes the oldest overflow stories out of the live feed after publish
- `refresh:news`
  - runs `ingest:gnews`, `ingest:gdelt`, `ingest:google-news-rss`, `ingest:rss`, `review:pending`, then `publish:approved`

## Optional Groq review env vars

```env
GROQ_API_KEY=your-groq-api-key
GROQ_REVIEW_MODEL=qwen/qwen3.8-27b
AI_REVIEW_LIMIT=200
AI_REVIEW_PER_REGION_LIMIT=12
AI_REVIEW_MIN_CONFIDENCE=0.6
AI_REVIEW_MAX_DESCRIPTION_CHARS=1200
AI_REVIEW_MAX_CONTENT_CHARS=2200
HEURISTIC_AUTO_APPROVE_SCORE=0.75
INGEST_GNEWS_MAX_RESULTS=25
INGEST_GNEWS_PAGES=1
INGEST_GOOGLE_NEWS_RSS_MAX_ITEMS=25
INGEST_GOOGLE_NEWS_RSS_MAX_RETRIES=2
INGEST_NEWSDATA_PAGES=1
INGEST_NEWSDATA_TIMEFRAME=
INGEST_GDELT_MAX_RECORDS=30
INGEST_RSS_MAX_ITEMS_PER_FEED=40
INGEST_RSS_MAX_RETRIES=2
MAX_PUBLISHED_STORIES=150
```

`AI_REVIEW_PER_REGION_LIMIT` keeps the review run balanced across countries and publishers. Each run considers pending stories from the last 14 days. Articles already reviewed as ambiguous (`AI pending`) remain available for manual review rather than consuming every scheduled batch again.

The scheduled pipeline requires `GROQ_API_KEY`. Review checks the active Groq models before processing the queue; if the configured model is unavailable, it tries the known Qwen 3.8/3.6 replacements. If none are available it fails visibly. Per-article AI failures leave stories pending and cause the refresh job to fail, rather than approving them heuristically. Ingestion's initial heuristic triage remains separate.

Publishing processes up to 200 approved articles per run (`PUBLISH_APPROVED_LIMIT`) and reconciles already-published source URLs so duplicates cannot keep occupying the queue. The workflow summary reports reviews, approvals, AI failures, publications, and latest story date. A failed review/publish stage or a feed older than 48 hours fails the job. Enable GitHub Actions failure notifications for this repository.

## Cron example

```cron
17 */6 * * * cd /path/to/bright-news && /usr/bin/npm run refresh:news >> /tmp/bright-news-refresh.log 2>&1
```

## GitHub Actions automation

Queue indexes are defined in `docs/supabase_ingestion_queue_indexes.sql` and were applied to the linked production project during the September recovery. Re-ingestion preserves reviewed decisions and the reviewed country/category rather than replacing them with source defaults.

The repo now includes a scheduled GitHub Actions workflow at
`.github/workflows/refresh-news.yml`.

By default it runs:

- every 6 hours (GitHub may delay scheduled jobs)
- and manually through `Actions -> Refresh News -> Run workflow`

Set these GitHub repository secrets before relying on it:

- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional GitHub repository secrets:

- `GNEWS_API_KEY`
- `NEWSDATA_API_KEY`
- `GROQ_API_KEY`

Optional GitHub repository variables:

- `GROQ_REVIEW_MODEL`
- `AI_REVIEW_LIMIT`
- `AI_REVIEW_PER_REGION_LIMIT`
- `AI_REVIEW_MIN_CONFIDENCE`
- `HEURISTIC_AUTO_APPROVE_SCORE`
- `ALLOW_LOCAL_HEURISTIC_AUTO_APPROVE`
- `INGEST_GNEWS_MAX_RESULTS`
- `INGEST_GNEWS_PAGES`
- `INGEST_GOOGLE_NEWS_RSS_MAX_ITEMS`
- `INGEST_GOOGLE_NEWS_RSS_MAX_RETRIES`
- `INGEST_NEWSDATA_PAGES`
- `INGEST_NEWSDATA_TIMEFRAME`
- `INGEST_GDELT_MAX_RECORDS`
- `INGEST_RSS_MAX_ITEMS_PER_FEED`
- `INGEST_RSS_MAX_RETRIES`
- `MAX_PUBLISHED_STORIES`

If you do not set the optional values, the script falls back to the defaults in code.

## Required SQL setup

Run these SQL files in Supabase:

- `docs/supabase_raw_articles.sql`
- `docs/supabase_saved_stories.sql`
- `docs/supabase_profiles.sql`

## Review workflow

1. Run `npm run ingest:gnews`, `npm run ingest:gdelt`, `npm run ingest:google-news-rss`, and/or `npm run ingest:newsdata`
2. Run `npm run ingest:rss`
3. Run `npm run review:pending`
4. Inspect `public.raw_articles` in Supabase only for borderline rows that remain `pending`
5. Run `npm run publish:approved`
6. Or run `npm run refresh:news` to do the full pipeline end to end

## Current limits

- this is an MVP ingestion path, not a perfect editorial system
- positivity filtering is partly heuristic before the final AI review
- region and category mapping are approximate
- local/national coverage quality depends heavily on available source coverage inside each upstream API
- stories can still remain `pending` for manual review when the model is not confident enough
- cron deployment is not installed automatically by the repo

## Recommended next step

Move these scripts into scheduled backend jobs and add better moderation tooling:

- admin UI for review instead of using Supabase table editor
- richer source curation and dedupe rules
- monitoring/logging for scheduled runs
