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
NEWSCATCHER_API_KEY=your-newscatcher-api-key
```

`GDELT` does not require an API key for DOC 2.0 requests.

## Run locally

```bash
npm run ingest:gnews
npm run ingest:gdelt
npm run ingest:google-news-rss
npm run ingest:newscatcher
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
- `ingest:newscatcher`
  - fetches candidate articles from NewsCatcher's v3 search API using the same category and region matrix
  - uses the `x-api-token` header and normalizes NewsCatcher article fields into the BrightNews raw article shape
  - supports larger page sizes and pagination through `INGEST_NEWSCATCHER_PAGE_SIZE` and `INGEST_NEWSCATCHER_PAGES`
  - stores candidates in `public.raw_articles` for the same review/publish flow
- `ingest:rss`
  - fetches curated positive-news RSS feeds directly
  - includes additional curated German and Croatian feeds for stronger regional coverage
  - now continues if one RSS feed fails instead of aborting the entire RSS run
  - supports per-feed caps through `INGEST_RSS_MAX_ITEMS_PER_FEED`
  - maps source tags into BrightNews categories and regions
- `review:pending`
  - sends pending candidate stories to OpenAI for a final uplifting/not-uplifting decision
  - updates category and region if the model gives a better fit
  - only approved rows are eligible for publication
- `publish:approved`
  - reads `raw_articles` with `review_status = 'approved'`
  - inserts them into `public.stories`
  - marks them as `published`
  - enforces a live feed cap through `MAX_PUBLISHED_STORIES`
  - prunes the oldest overflow stories out of the live feed after publish
- `refresh:news`
  - runs `ingest:gnews`, `ingest:gdelt`, `ingest:google-news-rss`, `ingest:newscatcher`, `ingest:rss`, `review:pending`, then `publish:approved`

## Optional OpenAI env vars

```env
OPENAI_API_KEY=your-openai-api-key
OPENAI_REVIEW_MODEL=gpt-5-mini
OPENAI_REVIEW_LIMIT=200
OPENAI_REVIEW_MIN_CONFIDENCE=0.6
HEURISTIC_AUTO_APPROVE_SCORE=0.75
INGEST_GNEWS_MAX_RESULTS=25
INGEST_GNEWS_PAGES=1
INGEST_GOOGLE_NEWS_RSS_MAX_ITEMS=25
INGEST_GOOGLE_NEWS_RSS_MAX_RETRIES=2
INGEST_NEWSCATCHER_PAGE_SIZE=25
INGEST_NEWSCATCHER_PAGES=1
INGEST_GDELT_MAX_RECORDS=30
INGEST_RSS_MAX_ITEMS_PER_FEED=40
INGEST_RSS_MAX_RETRIES=2
MAX_PUBLISHED_STORIES=150
```

`HEURISTIC_AUTO_APPROVE_SCORE` controls how aggressive the no-OpenAI fallback is. The current code default is `0.66`, which is tuned to let through stronger regional science/health stories without broadly opening the floodgates.

## Cron example

```cron
0 */12 * * * cd /path/to/bright-news && /usr/bin/npm run refresh:news >> /tmp/bright-news-refresh.log 2>&1
```

## Required SQL setup

Run these SQL files in Supabase:

- `docs/supabase_raw_articles.sql`
- `docs/supabase_saved_stories.sql`
- `docs/supabase_profiles.sql`

## Review workflow

1. Run `npm run ingest:gnews`, `npm run ingest:gdelt`, `npm run ingest:google-news-rss`, and/or `npm run ingest:newscatcher`
2. Run `npm run ingest:rss`
3. Run `npm run review:pending`
4. Inspect `public.raw_articles` in Supabase only for borderline rows that remain `pending`
5. Run `npm run publish:approved`
6. Or run `npm run refresh:news` to do the full pipeline end to end

## Current limits

- this is an MVP ingestion path, not a perfect editorial system
- positivity filtering is partly heuristic before the final AI review
- region and category mapping are approximate
- stories can still remain `pending` for manual review when the model is not confident enough
- cron deployment is not installed automatically by the repo

## Recommended next step

Move these scripts into scheduled backend jobs and add better moderation tooling:

- admin UI for review instead of using Supabase table editor
- richer source curation and dedupe rules
- monitoring/logging for scheduled runs
