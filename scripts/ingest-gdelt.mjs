import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import {
  buildRawArticleRow,
  CATEGORY_CONFIG,
  DEFAULT_INGEST_REGION_CODES,
  dedupeBySourceUrl,
  getCategoryEmoji,
  getLocalizedCategoryQuery,
  parseRssItems,
  REGION_CONFIG,
  resolveRegionCode,
  sleep,
  upsertRawArticles,
} from "./lib/ingestion-shared.mjs";

const GDELT_BASE_URL = "https://api.gdeltproject.org/api/v2/doc/doc";

const REGION_QUERY_TERMS = {
  world: "",
  us: "(\"United States\" OR USA OR American)",
  uk: "(\"United Kingdom\" OR Britain OR British OR England OR Scotland OR Wales)",
  hr: "(Croatia OR Croatian)",
  de: "(Germany OR German)",
  fr: "(France OR French)",
  jp: "(Japan OR Japanese)",
  au: "(Australia OR Australian)",
  br: "(Brazil OR Brazilian)",
  in: "(India OR Indian)",
};

const getEnv = name => process.env[name];
const getRequiredEnv = name => {
  const value = getEnv(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const supabaseUrl = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl) {
  throw new Error("Missing required environment variable: SUPABASE_URL or VITE_SUPABASE_URL");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const requestDelayMs = Number(getEnv("INGEST_GDELT_REQUEST_DELAY_MS") || 5500);
const maxRetriesPerRequest = Number(getEnv("INGEST_GDELT_MAX_RETRIES") || 3);
const retryDelayMs = Number(getEnv("INGEST_GDELT_RETRY_DELAY_MS") || 5000);
const timespan = getEnv("INGEST_GDELT_TIMESPAN") || "7d";
const maxRecords = Number(getEnv("INGEST_GDELT_MAX_RECORDS") || 30);
const enabledRegionCodes = (getEnv("INGEST_REGION_CODES") || DEFAULT_INGEST_REGION_CODES)
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

const buildQuery = ({ region, category }) => {
  const regionQuery = REGION_QUERY_TERMS[region.code] || "";
  const categoryQuery = getLocalizedCategoryQuery(category, region.lang);
  return regionQuery ? `(${categoryQuery}) AND ${regionQuery}` : categoryQuery;
};

const deriveSourceName = urlValue => {
  try {
    const url = new URL(urlValue);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "GDELT";
  }
};

const fetchFeed = async ({ region, category }) => {
  const params = new URLSearchParams({
    query: buildQuery({ region, category }),
    mode: "artlist",
    format: "rss",
    timespan,
    maxrecords: String(maxRecords),
    sort: "DateDesc",
  });

  for (let attempt = 0; attempt <= maxRetriesPerRequest; attempt += 1) {
    const response = await fetch(`${GDELT_BASE_URL}?${params.toString()}`);
    const xml = await response.text();

    if (response.ok) {
      return xml;
    }

      const shouldRetry = (response.status === 429 || response.status >= 500) && attempt < maxRetriesPerRequest;
      if (shouldRetry) {
        const delay = response.status === 429
          ? Math.max(requestDelayMs, retryDelayMs * (attempt + 1))
          : retryDelayMs * (attempt + 1);
        await sleep(delay);
        continue;
      }

    throw new Error(`GDELT error ${response.status}: ${xml.slice(0, 180)}`);
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
      const xml = await fetchFeed({ region, category });
      const items = parseRssItems(xml);

      for (const item of items) {
        const resolvedRegionCode = region.code === "world"
          ? resolveRegionCode({
            title: item.title,
            description: item.description,
            content: item.content_encoded,
            tags: [category.category],
            sourceUrl: item.link,
          })
          : region.code;

        const row = buildRawArticleRow({
          vendor: "gdelt",
          sourceName: deriveSourceName(item.link),
          article: {
            url: item.link,
            title: item.title,
            description: item.description,
            content: item.content_encoded,
            publishedAt: item.pubDate,
          },
          regionCode: resolvedRegionCode,
          countryCode: REGION_CONFIG.find(candidate => candidate.code === resolvedRegionCode)?.country || null,
          category: category.category,
          emoji: getCategoryEmoji(category.category),
          tags: [category.category, "gdelt"],
          rawPayload: {
            ...item,
            gdelt_query: buildQuery({ region, category }),
          },
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
