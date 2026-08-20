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
  resolveCategory,
  resolveRegionCode,
  sleep,
  toSentence,
  upsertRawArticles,
} from "./lib/ingestion-shared.mjs";

const GOOGLE_NEWS_BASE_URL = "https://news.google.com/rss";

const GOOGLE_NEWS_REGION_CONFIG = {
  world: { hl: "en-US", gl: "US", ceid: "US:en" },
  us: { hl: "en-US", gl: "US", ceid: "US:en" },
  uk: { hl: "en-GB", gl: "GB", ceid: "GB:en" },
  hr: { hl: "hr", gl: "HR", ceid: "HR:hr" },
  si: { hl: "sl", gl: "SI", ceid: "SI:sl" },
  rs: { hl: "sr", gl: "RS", ceid: "RS:sr" },
  ba: { hl: "bs", gl: "BA", ceid: "BA:bs" },
  de: { hl: "de", gl: "DE", ceid: "DE:de" },
  fr: { hl: "fr", gl: "FR", ceid: "FR:fr" },
  ca: { hl: "en-CA", gl: "CA", ceid: "CA:en" },
  jp: { hl: "ja", gl: "JP", ceid: "JP:ja" },
  my: { hl: "en-MY", gl: "MY", ceid: "MY:en" },
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
const maxItemsPerCategoryFeed = Number(getEnv("INGEST_GOOGLE_NEWS_RSS_CATEGORY_MAX_ITEMS") || 10);
const maxRetriesPerRequest = Number(getEnv("INGEST_GOOGLE_NEWS_RSS_MAX_RETRIES") || 2);
const retryDelayMs = Number(getEnv("INGEST_GOOGLE_NEWS_RSS_RETRY_DELAY_MS") || 4000);
const includeTopFeed = getEnv("INGEST_GOOGLE_NEWS_RSS_INCLUDE_TOP_FEED") !== "false";
const includeCategoryFeeds = getEnv("INGEST_GOOGLE_NEWS_RSS_CATEGORY_FEEDS") !== "false";
const defaultCategoryFeedNames = "Environment,Science,Health,Innovation";
const categoryFeedNames = new Set(
  (getEnv("INGEST_GOOGLE_NEWS_RSS_CATEGORY_NAMES") || defaultCategoryFeedNames)
    .split(",")
    .map(value => value.trim())
    .filter(Boolean),
);
const categoryFeedLimit = Math.max(0, Number(getEnv("INGEST_GOOGLE_NEWS_RSS_CATEGORY_LIMIT") || categoryFeedNames.size));
const enabledRegionCodes = (getEnv("INGEST_REGION_CODES") || DEFAULT_INGEST_REGION_CODES)
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

const buildFeedUrl = ({ region, query }) => {
  const locale = GOOGLE_NEWS_REGION_CONFIG[region.code] || GOOGLE_NEWS_REGION_CONFIG.world;
  const params = new URLSearchParams({
    hl: locale.hl,
    gl: locale.gl,
    ceid: locale.ceid,
  });

  if (query) {
    params.set("q", query);
    return `${GOOGLE_NEWS_BASE_URL}/search?${params.toString()}`;
  }

  return `${GOOGLE_NEWS_BASE_URL}?${params.toString()}`;
};

const getRegionFeeds = region => {
  const feeds = [];

  if (includeTopFeed) {
    feeds.push({
      url: buildFeedUrl({ region }),
      category: null,
      label: `${region.code}:top`,
      maxItems: maxItemsPerFeed,
    });
  }

  if (includeCategoryFeeds) {
    const enabledCategories = CATEGORY_CONFIG
      .filter(category => categoryFeedNames.has(category.category))
      .slice(0, categoryFeedLimit);

    for (const category of enabledCategories) {
      feeds.push({
        url: buildFeedUrl({
          region,
          query: getLocalizedCategoryQuery(category, region.lang),
        }),
        category: category.category,
        label: `${region.code}:${category.category}`,
        maxItems: maxItemsPerCategoryFeed,
      });
    }
  }

  return feeds;
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

const fetchFeed = async feed => {
  for (let attempt = 0; attempt <= maxRetriesPerRequest; attempt += 1) {
    try {
      const response = await fetch(feed.url);
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

const ENGLISH_STOPWORDS = [
  "a",
  "an",
  "as",
  "at",
  "be",
  "by",
  "for",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "to",
  "the",
  "and",
  "are",
  "with",
  "will",
  "after",
  "from",
  "this",
  "that",
  "into",
  "over",
  "under",
  "concerns",
  "government",
];

const isLikelyEnglishHeadline = value => {
  const headline = toSentence(value).toLowerCase();
  if (!headline) return false;

  if (/[\u0100-\u024f\u0400-\u04ff\u3040-\u30ff\u3400-\u9fff]/u.test(headline)) {
    return false;
  }

  const words = headline.match(/[a-z]+/g) || [];
  const stopwordHits = words.filter(word => ENGLISH_STOPWORDS.includes(word)).length;
  const hasEnglishPossessive = /[a-z]'s\b/.test(headline);
  return words.length >= 5 && (stopwordHits >= 2 || (stopwordHits >= 1 && hasEnglishPossessive));
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
    for (const feed of getRegionFeeds(region)) {
      try {
        const xml = await fetchFeed(feed);
        const items = parseRssItems(xml).slice(0, feed.maxItems || maxItemsPerFeed);

        for (const item of items) {
          const { title, sourceName } = splitHeadlineAndSource(item.title, deriveSourceName(item));

          if (region.lang !== "en" && isLikelyEnglishHeadline(title)) {
            continue;
          }

          const category = feed.category || resolveCategory({
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

          const row = await buildRawArticleRow({
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
              google_news_feed: feed.url,
              google_news_feed_label: feed.label,
            },
          });

          if (row) {
            fetchedArticles.push(row);
          }
        }

        succeededRegions.push(feed.label);
      } catch (error) {
        regionErrors.push({
          region: region.code,
          feed: feed.label,
          error: error?.message || "Unknown Google News RSS region error",
        });
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
