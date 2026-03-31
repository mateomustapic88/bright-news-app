import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import {
  buildRawArticleRow,
  CATEGORY_CONFIG,
  DEFAULT_INGEST_REGION_CODES,
  dedupeBySourceUrl,
  getCategoryEmoji,
  getLocalizedCategoryQuery,
  REGION_CONFIG,
  sleep,
  upsertRawArticles,
} from "./lib/ingestion-shared.mjs";

const NEWSDATA_BASE_URL = "https://newsdata.io/api/1/latest";

const getEnv = name => process.env[name];
const getRequiredEnv = name => {
  const value = getEnv(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const supabaseUrl = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const newsDataApiKey = getEnv("NEWSDATA_API_KEY");

if (!supabaseUrl) {
  throw new Error("Missing required environment variable: SUPABASE_URL or VITE_SUPABASE_URL");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const requestDelayMs = Number(getEnv("INGEST_NEWSDATA_REQUEST_DELAY_MS") || 1200);
const maxRetriesPerRequest = Number(getEnv("INGEST_NEWSDATA_MAX_RETRIES") || 3);
const retryDelayMs = Number(getEnv("INGEST_NEWSDATA_RETRY_DELAY_MS") || 5000);
const maxPages = Math.max(1, Number(getEnv("INGEST_NEWSDATA_PAGES") || 1));
const timeframe = getEnv("INGEST_NEWSDATA_TIMEFRAME") || "";
const queryMode = (getEnv("INGEST_NEWSDATA_QUERY_MODE") || "category").trim().toLowerCase();
const enabledRegionCodes = (getEnv("INGEST_REGION_CODES") || DEFAULT_INGEST_REGION_CODES)
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

const collectTags = (article, fallbackCategory) => {
  const rawTags = [
    fallbackCategory,
    article.source_id,
    article.source_name,
    ...(Array.isArray(article.category) ? article.category : []),
    ...(Array.isArray(article.country) ? article.country : []),
    ...(Array.isArray(article.ai_tag) ? article.ai_tag : []),
    ...(Array.isArray(article.keywords) ? article.keywords : []),
  ];

  return rawTags.filter(value => typeof value === "string" && value.trim());
};

const buildNewsDataQuery = (category, lang) => {
  const localizedQuery = getLocalizedCategoryQuery(category, lang)
    .replace(/"/g, "")
    .split(/\s+OR\s+/i)
    .map(part => part.trim())
    .filter(Boolean);

  let query = "";

  for (const term of localizedQuery) {
    const nextQuery = query ? `${query} OR ${term}` : term;
    if (nextQuery.length > 96) break;
    query = nextQuery;
  }

  return query || category.category;
};

const fetchArticles = async ({ region, category }) => {
  const collectedArticles = [];
  let nextPageToken = null;

  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({
      apikey: newsDataApiKey,
      language: region.lang,
      removeduplicate: "1",
      image: "1",
    });

    if (queryMode !== "broad") {
      params.set("q", buildNewsDataQuery(category, region.lang));
    }

    if (timeframe) {
      params.set("timeframe", timeframe);
    }

    if (region.country) {
      params.set("country", region.country);
    }

    if (nextPageToken) {
      params.set("page", nextPageToken);
    }

    let pageArticles = [];
    let responseNextPage = null;

    for (let attempt = 0; attempt <= maxRetriesPerRequest; attempt += 1) {
      const response = await fetch(`${NEWSDATA_BASE_URL}?${params.toString()}`);
      const payload = await response.json();

      if (response.ok && payload?.status === "success") {
        pageArticles = payload.results || [];
        responseNextPage = payload.nextPage || null;
        break;
      }

      const message = payload?.results?.message || payload?.message || `NewsData error ${response.status}`;
      const shouldRetry = (response.status === 429 || response.status >= 500) && attempt < maxRetriesPerRequest;

      if (shouldRetry) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }

      throw new Error(`NewsData error ${response.status}: ${message}`);
    }

    collectedArticles.push(...pageArticles);

    if (!responseNextPage || pageArticles.length === 0) {
      break;
    }

    nextPageToken = responseNextPage;

    if (page < maxPages) {
      await sleep(requestDelayMs);
    }
  }

  return collectedArticles;
};

export const run = async () => {
  if (!newsDataApiKey) {
    const skipped = {
      skipped: true,
      reason: "NEWSDATA_API_KEY is missing.",
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
          vendor: "newsdata",
          sourceName: article.source_name || article.source_id || "NewsData.io",
          article: {
            url: article.link,
            title: article.title,
            description: article.description || article.content || "",
            content: article.content || "",
            image: article.image_url,
            publishedAt: article.pubDate,
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
