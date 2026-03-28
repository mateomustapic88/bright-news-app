import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import {
  buildRawArticleRow,
  DEFAULT_INGEST_REGION_CODES,
  dedupeBySourceUrl,
  getCategoryEmoji,
  parseRssItems,
  REGION_CONFIG,
  resolveCategory,
  resolveRegionCode,
  sleep,
  upsertRawArticles,
} from "./lib/ingestion-shared.mjs";

const GOOGLE_NEWS_BASE_URL = "https://news.google.com/rss";

const GOOGLE_NEWS_REGION_CONFIG = {
  world: { hl: "en-US", gl: "US", ceid: "US:en" },
  us: { hl: "en-US", gl: "US", ceid: "US:en" },
  uk: { hl: "en-GB", gl: "GB", ceid: "GB:en" },
  hr: { hl: "hr", gl: "HR", ceid: "HR:hr" },
  de: { hl: "de", gl: "DE", ceid: "DE:de" },
  fr: { hl: "fr", gl: "FR", ceid: "FR:fr" },
  jp: { hl: "ja", gl: "JP", ceid: "JP:ja" },
  au: { hl: "en-AU", gl: "AU", ceid: "AU:en" },
  br: { hl: "pt-BR", gl: "BR", ceid: "BR:pt-419" },
  in: { hl: "en-IN", gl: "IN", ceid: "IN:en" },
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
const requestDelayMs = Number(getEnv("INGEST_GOOGLE_NEWS_RSS_REQUEST_DELAY_MS") || 1200);
const maxItemsPerFeed = Number(getEnv("INGEST_GOOGLE_NEWS_RSS_MAX_ITEMS") || 25);
const maxRetriesPerRequest = Number(getEnv("INGEST_GOOGLE_NEWS_RSS_MAX_RETRIES") || 2);
const retryDelayMs = Number(getEnv("INGEST_GOOGLE_NEWS_RSS_RETRY_DELAY_MS") || 4000);
const enabledRegionCodes = (getEnv("INGEST_REGION_CODES") || DEFAULT_INGEST_REGION_CODES)
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

const buildFeedUrl = ({ region }) => {
  const locale = GOOGLE_NEWS_REGION_CONFIG[region.code] || GOOGLE_NEWS_REGION_CONFIG.world;
  const params = new URLSearchParams({
    hl: locale.hl,
    gl: locale.gl,
    ceid: locale.ceid,
  });

  return `${GOOGLE_NEWS_BASE_URL}?${params.toString()}`;
};

const splitHeadlineAndSource = (rawTitle, explicitSourceName = "") => {
  const title = String(rawTitle || "").trim();
  const sourceName = String(explicitSourceName || "").trim();

  if (sourceName && title.toLowerCase().endsWith(` - ${sourceName}`.toLowerCase())) {
    return {
      title: title.slice(0, -(sourceName.length + 3)).trim(),
      sourceName,
    };
  }

  const parts = title.split(" - ");
  if (parts.length >= 2) {
    const trailingSourceName = parts.at(-1)?.trim() || "";
    const headline = parts.slice(0, -1).join(" - ").trim();

    if (headline && trailingSourceName && trailingSourceName.length <= 60) {
      return {
        title: headline,
        sourceName: sourceName || trailingSourceName,
      };
    }
  }

  return {
    title,
    sourceName,
  };
};

const fetchFeed = async ({ region }) => {
  for (let attempt = 0; attempt <= maxRetriesPerRequest; attempt += 1) {
    try {
      const response = await fetch(buildFeedUrl({ region }));
      const xml = await response.text();

      if (!response.ok) {
        throw new Error(`Google News RSS error ${response.status}: ${xml.slice(0, 180)}`);
      }

      return xml;
    } catch (error) {
      if (attempt < maxRetriesPerRequest) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }

      throw error;
    }
  }
};

const deriveSourceName = item => {
  if (item.source) return item.source;

  try {
    return new URL(item.link).hostname.replace(/^www\./, "");
  } catch {
    return "Google News";
  }
};

export const run = async () => {
  const fetchedArticles = [];
  const regionErrors = [];
  const succeededRegions = [];
  const enabledRegions = REGION_CONFIG.filter(region => enabledRegionCodes.includes(region.code));

  if (enabledRegions.length === 0) {
    throw new Error(`No matching regions found for INGEST_REGION_CODES=${enabledRegionCodes.join(",")}`);
  }

  for (const region of enabledRegions) {
    try {
      const xml = await fetchFeed({ region });
      const items = parseRssItems(xml).slice(0, maxItemsPerFeed);

      for (const item of items) {
        const { title, sourceName } = splitHeadlineAndSource(item.title, deriveSourceName(item));
        const category = resolveCategory({
          title,
          description: item.description,
          content: item.content_encoded,
          tags: item.categories,
        });

        const sourceUrl = item.source_url || item.link;
        const resolvedRegionCode = region.code === "world"
          ? resolveRegionCode({
            title,
            description: item.description,
            content: item.content_encoded,
            tags: [...item.categories, category, sourceName],
            sourceUrl,
          })
          : region.code;

        const row = buildRawArticleRow({
          vendor: "google_news_rss",
          sourceName,
          article: {
            url: item.link,
            title,
            description: item.description,
            content: item.content_encoded,
            publishedAt: item.pubDate,
          },
          regionCode: resolvedRegionCode,
          countryCode: REGION_CONFIG.find(candidate => candidate.code === resolvedRegionCode)?.country || null,
          category,
          emoji: getCategoryEmoji(category),
          tags: [...item.categories, category, "google_news_rss", sourceName],
          rawPayload: {
            ...item,
            google_news_feed: buildFeedUrl({ region }),
          },
        });

        if (row) {
          fetchedArticles.push(row);
        }
      }

      succeededRegions.push(region.code);
    } catch (error) {
      regionErrors.push({
        region: region.code,
        error: error?.message || "Unknown Google News RSS region error",
      });
    }

    await sleep(requestDelayMs);
  }

  const dedupedRows = dedupeBySourceUrl(fetchedArticles);
  const written = await upsertRawArticles(supabase, dedupedRows);
  const approved = dedupedRows.filter(row => row.review_status === "approved").length;
  const pending = dedupedRows.filter(row => row.review_status === "pending").length;
  const rejected = dedupedRows.filter(row => row.review_status === "rejected").length;

  const result = {
    skipped: false,
    regions: succeededRegions,
    regionErrors,
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
