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

const GNEWS_BASE_URL = "https://gnews.io/api/v4/search";

const getEnv = name => process.env[name];
const getRequiredEnv = name => {
  const value = getEnv(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const supabaseUrl = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const gnewsApiKey = getRequiredEnv("GNEWS_API_KEY");

if (!supabaseUrl) {
  throw new Error("Missing required environment variable: SUPABASE_URL or VITE_SUPABASE_URL");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const requestDelayMs = Number(getEnv("INGEST_REQUEST_DELAY_MS") || 1500);
const maxRetriesPerRequest = Number(getEnv("INGEST_MAX_RETRIES") || 3);
const retryDelayMs = Number(getEnv("INGEST_RETRY_DELAY_MS") || 5000);
const enabledRegionCodes = (getEnv("INGEST_REGION_CODES") || DEFAULT_INGEST_REGION_CODES)
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

const fetchArticles = async ({ region, category }) => {
  const params = new URLSearchParams({
    q: category.query,
    lang: region.lang,
    max: "10",
    sortby: "publishedAt",
    apikey: gnewsApiKey,
  });

  if (region.country) {
    params.set("country", region.country);
  }

  for (let attempt = 0; attempt <= maxRetriesPerRequest; attempt += 1) {
    const response = await fetch(`${GNEWS_BASE_URL}?${params.toString()}`);
    const payload = await response.json();

    if (response.ok) {
      return payload.articles || [];
    }

    const message = payload?.errors?.join(", ") || payload?.message || "Unknown error";
    const isRateLimited = response.status === 429;

    if (isRateLimited && attempt < maxRetriesPerRequest) {
      await sleep(retryDelayMs * (attempt + 1));
      continue;
    }

    throw new Error(`GNews error ${response.status}: ${message}`);
  }
};

export const run = async () => {
  const fetchedArticles = [];
  const enabledRegions = REGION_CONFIG.filter(region => enabledRegionCodes.includes(region.code));

  if (enabledRegions.length === 0) {
    throw new Error(`No matching regions found for INGEST_REGION_CODES=${enabledRegionCodes.join(",")}`);
  }

  for (const region of enabledRegions) {
    for (const category of CATEGORY_CONFIG) {
      const articles = await fetchArticles({ region, category });

      for (const article of articles) {
        if (!article.url || !article.title) continue;

        const row = buildRawArticleRow({
          vendor: "gnews",
          sourceName: article.source?.name || "GNews",
          article: {
            url: article.url,
            title: article.title,
            description: article.description,
            content: article.content,
            image: article.image,
            publishedAt: article.publishedAt,
          },
          regionCode: region.code,
          countryCode: region.country || null,
          category: category.category,
          emoji: getCategoryEmoji(category.category),
          tags: [category.category, article.source?.name || ""],
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
