import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import {
  buildRawArticleRow,
  CATEGORY_CONFIG,
  DEFAULT_INGEST_REGION_CODES,
  dedupeBySourceUrl,
  getCategoryEmoji,
  REGION_CONFIG,
  sleep,
  upsertRawArticles,
} from "./lib/ingestion-shared.mjs";

const NEWSCATCHER_BASE_URL = "https://v3-api.newscatcherapi.com/api/search";

const getEnv = name => process.env[name];
const getRequiredEnv = name => {
  const value = getEnv(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const supabaseUrl = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const newsCatcherApiKey = getEnv("NEWSCATCHER_API_KEY");

if (!supabaseUrl) {
  throw new Error("Missing required environment variable: SUPABASE_URL or VITE_SUPABASE_URL");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const requestDelayMs = Number(getEnv("INGEST_NEWSCATCHER_REQUEST_DELAY_MS") || 1200);
const maxRetriesPerRequest = Number(getEnv("INGEST_NEWSCATCHER_MAX_RETRIES") || 3);
const retryDelayMs = Number(getEnv("INGEST_NEWSCATCHER_RETRY_DELAY_MS") || 5000);
const pageSize = Number(getEnv("INGEST_NEWSCATCHER_PAGE_SIZE") || 10);
const fromDate = getEnv("INGEST_NEWSCATCHER_FROM") || "7 days ago";
const enabledRegionCodes = (getEnv("INGEST_REGION_CODES") || DEFAULT_INGEST_REGION_CODES)
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

const collectTags = (article, fallbackCategory) => {
  const rawTags = [
    fallbackCategory,
    article.theme,
    article.topic,
    article.name_source,
    ...(Array.isArray(article.categories) ? article.categories : []),
  ];

  return rawTags.filter(value => typeof value === "string" && value.trim());
};

const fetchArticles = async ({ region, category }) => {
  const params = new URLSearchParams({
    q: category.query,
    lang: region.lang,
    from_: fromDate,
    sort_by: "date",
    search_in: "title_content",
    page_size: String(pageSize),
    is_paid_content: "false",
  });

  if (region.country) {
    params.set("countries", region.country.toUpperCase());
  }

  for (let attempt = 0; attempt <= maxRetriesPerRequest; attempt += 1) {
    const response = await fetch(`${NEWSCATCHER_BASE_URL}?${params.toString()}`, {
      headers: {
        "x-api-token": newsCatcherApiKey,
      },
    });
    const payload = await response.json();

    if (response.ok) {
      return payload.articles || [];
    }

    const message = payload?.error?.message || payload?.message || `NewsCatcher error ${response.status}`;
    const shouldRetry = (response.status === 429 || response.status >= 500) && attempt < maxRetriesPerRequest;

    if (shouldRetry) {
      await sleep(retryDelayMs * (attempt + 1));
      continue;
    }

    throw new Error(`NewsCatcher error ${response.status}: ${message}`);
  }
};

export const run = async () => {
  if (!newsCatcherApiKey) {
    const skipped = {
      skipped: true,
      reason: "NEWSCATCHER_API_KEY is missing.",
    };

    console.log(JSON.stringify(skipped, null, 2));
    return skipped;
  }

  const fetchedArticles = [];
  const enabledRegions = REGION_CONFIG.filter(region => enabledRegionCodes.includes(region.code));

  if (enabledRegions.length === 0) {
    throw new Error(`No matching regions found for INGEST_REGION_CODES=${enabledRegionCodes.join(",")}`);
  }

  for (const region of enabledRegions) {
    for (const category of CATEGORY_CONFIG) {
      const articles = await fetchArticles({ region, category });

      for (const article of articles) {
        const row = buildRawArticleRow({
          vendor: "newscatcher",
          sourceName: article.name_source || article.clean_url || "NewsCatcher",
          article: {
            url: article.link || article.url,
            title: article.title,
            description: article.summary || article.description || article.excerpt,
            content: article.content || article.snippet || article.rights || "",
            image: article.media || article.image_url || article.media_thumbnail,
            publishedAt: article.published_date || article.publishedAt || article.published_at,
          },
          regionCode: region.code,
          countryCode: region.country || null,
          category: category.category,
          emoji: getCategoryEmoji(category.category),
          tags: collectTags(article, category.category),
          rawPayload: article,
        });

        if (row) {
          fetchedArticles.push(row);
        }
      }

      await sleep(requestDelayMs);
    }
  }

  const dedupedRows = dedupeBySourceUrl(fetchedArticles);
  const written = await upsertRawArticles(supabase, dedupedRows);
  const approved = dedupedRows.filter(row => row.review_status === "approved").length;
  const pending = dedupedRows.filter(row => row.review_status === "pending").length;
  const rejected = dedupedRows.filter(row => row.review_status === "rejected").length;

  const result = {
    skipped: false,
    regions: enabledRegions.map(region => region.code),
    fetched: fetchedArticles.length,
    deduped: dedupedRows.length,
    written,
    approved,
    pending,
    rejected,
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
};

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  run().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
