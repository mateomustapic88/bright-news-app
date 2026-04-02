import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import {
  buildRawArticleRow,
  CATEGORY_CONFIG,
  dedupeBySourceUrl,
  getCategoryEmoji,
  getLocalizedCategoryQuery,
  REGION_CONFIG,
  sleep,
  upsertRawArticles,
} from "./lib/ingestion-shared.mjs";

const GUARDIAN_BASE_URL = "https://content.guardianapis.com/search";
const GUARDED_CATEGORY_NAMES = new Set(["Environment", "Science", "Health", "Innovation"]);
const GUARDIAN_REGION_CONFIG = {
  world: { edition: "", countryCode: null },
  uk: { edition: "UK", countryCode: "gb" },
  us: { edition: "US", countryCode: "us" },
  au: { edition: "AU", countryCode: "au" },
};
const GUARDIAN_SECTION_BY_CATEGORY = {
  Environment: "environment",
  Science: "science",
  Health: "society",
  Innovation: "technology",
};

const getEnv = name => process.env[name];
const getRequiredEnv = name => {
  const value = getEnv(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const supabaseUrl = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const guardianApiKey = getEnv("GUARDIAN_API_KEY");

if (!supabaseUrl) {
  throw new Error("Missing required environment variable: SUPABASE_URL or VITE_SUPABASE_URL");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const requestDelayMs = Number(getEnv("INGEST_GUARDIAN_REQUEST_DELAY_MS") || 1000);
const maxRetriesPerRequest = Number(getEnv("INGEST_GUARDIAN_MAX_RETRIES") || 1);
const retryDelayMs = Number(getEnv("INGEST_GUARDIAN_RETRY_DELAY_MS") || 4000);
const fetchTimeoutMs = Number(getEnv("INGEST_GUARDIAN_FETCH_TIMEOUT_MS") || 5000);
const maxPages = Math.max(1, Number(getEnv("INGEST_GUARDIAN_PAGES") || 1));
const pageSize = Math.min(50, Number(getEnv("INGEST_GUARDIAN_PAGE_SIZE") || 5));
const enabledRegionCodes = (getEnv("INGEST_GUARDIAN_REGION_CODES") || "world,uk,us,au")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

const enabledCategories = CATEGORY_CONFIG.filter(category => GUARDED_CATEGORY_NAMES.has(category.category));

const fetchArticles = async ({ regionCode, category }) => {
  const collectedArticles = [];
  const regionConfig = GUARDIAN_REGION_CONFIG[regionCode] || GUARDIAN_REGION_CONFIG.world;

  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({
      "api-key": guardianApiKey,
      "page-size": String(pageSize),
      "order-by": "newest",
      "show-fields": "trailText,bodyText,thumbnail",
      page: String(page),
      q: getLocalizedCategoryQuery(category, "en"),
      section: GUARDIAN_SECTION_BY_CATEGORY[category.category],
    });

    if (regionConfig.edition) {
      params.set("edition", regionConfig.edition);
    }

    let pageResults = [];
    let totalPages = 1;

    for (let attempt = 0; attempt <= maxRetriesPerRequest; attempt += 1) {
      try {
        const response = await fetch(`${GUARDIAN_BASE_URL}?${params.toString()}`, {
          signal: AbortSignal.timeout(fetchTimeoutMs),
        });
        const payload = await response.json();

        if (response.ok && payload?.response?.status === "ok") {
          pageResults = payload.response.results || [];
          totalPages = Number(payload.response.pages || 1);
          break;
        }

        const message = payload?.response?.message || payload?.message || `Guardian error ${response.status}`;
        const shouldRetry = (response.status === 429 || response.status >= 500) && attempt < maxRetriesPerRequest;

        if (shouldRetry) {
          await sleep(retryDelayMs * (attempt + 1));
          continue;
        }

        throw new Error(`Guardian error ${response.status}: ${message}`);
      } catch (error) {
        const shouldRetry = attempt < maxRetriesPerRequest;

        if (shouldRetry) {
          await sleep(retryDelayMs * (attempt + 1));
          continue;
        }

        throw new Error(
          `Guardian fetch failed for region=${regionCode} category=${category.category} page=${page}: ${error?.message || "Unknown fetch error"}`,
        );
      }
    }

    collectedArticles.push(...pageResults);

    if (page >= totalPages || pageResults.length < pageSize) {
      break;
    }

    if (page < maxPages) {
      await sleep(requestDelayMs);
    }
  }

  return collectedArticles;
};

export const run = async () => {
  if (!guardianApiKey) {
    const skipped = {
      skipped: true,
      reason: "GUARDIAN_API_KEY is missing.",
    };

    console.log(JSON.stringify(skipped, null, 2));
    return skipped;
  }

  const fetchedArticles = [];
  const queryErrors = [];
  const enabledRegions = REGION_CONFIG.filter(region =>
    enabledRegionCodes.includes(region.code) && GUARDIAN_REGION_CONFIG[region.code],
  );

  if (enabledRegions.length === 0) {
    throw new Error(`No matching Guardian regions found for INGEST_GUARDIAN_REGION_CODES=${enabledRegionCodes.join(",")}`);
  }

  for (const region of enabledRegions) {
    for (const category of enabledCategories) {
      let articles = [];

      try {
        articles = await fetchArticles({ regionCode: region.code, category });
      } catch (error) {
        queryErrors.push({
          region: region.code,
          category: category.category,
          error: error?.message || "Unknown Guardian query error",
        });
        await sleep(requestDelayMs);
        continue;
      }

      for (const article of articles) {
        if (article.type !== "article" || !article.webUrl || !article.webTitle) {
          continue;
        }

        const row = buildRawArticleRow({
          vendor: "guardian",
          sourceName: "The Guardian",
          article: {
            url: article.webUrl,
            title: article.webTitle,
            description: article.fields?.trailText || "",
            content: String(article.fields?.bodyText || "").slice(0, 8000),
            image: article.fields?.thumbnail || "",
            publishedAt: article.webPublicationDate,
          },
          regionCode: region.code,
          countryCode: GUARDIAN_REGION_CONFIG[region.code]?.countryCode || null,
          category: category.category,
          emoji: getCategoryEmoji(category.category),
          tags: [
            category.category,
            article.sectionName || "",
            article.type || "",
            "guardian",
          ],
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
    categories: enabledCategories.map(category => category.category),
    queryErrors,
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
