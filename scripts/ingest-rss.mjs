import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import {
  buildRawArticleRow,
  dedupeBySourceUrl,
  getCategoryEmoji,
  parseRssItems,
  REGION_CONFIG,
  resolveCategory,
  resolveRegionCode,
  sleep,
  upsertRawArticles,
} from "./lib/ingestion-shared.mjs";

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
const requestDelayMs = Number(getEnv("INGEST_RSS_REQUEST_DELAY_MS") || 1000);
const maxRetriesPerRequest = Number(getEnv("INGEST_RSS_MAX_RETRIES") || 2);
const retryDelayMs = Number(getEnv("INGEST_RSS_RETRY_DELAY_MS") || 4000);
const maxItemsPerFeed = Number(getEnv("INGEST_RSS_MAX_ITEMS_PER_FEED") || 40);
const enabledRegionCodes = new Set(
  (getEnv("INGEST_REGION_CODES") || REGION_CONFIG.map(region => region.code).join(","))
    .split(",")
    .map(value => value.trim())
    .filter(Boolean),
);

const FEED_CONFIG = [
  {
    vendor: "goodnewsnetwork",
    sourceName: "Good News Network",
    feedUrl: "https://www.goodnewsnetwork.org/feed/",
  },
  {
    vendor: "positive_news",
    sourceName: "Positive News",
    feedUrl: "https://www.positive.news/feed/",
  },
  {
    vendor: "reasonstobecheerful",
    sourceName: "Reasons to be Cheerful",
    feedUrl: "https://reasonstobecheerful.world/feed/",
  },
  {
    vendor: "goodgoodgood",
    sourceName: "Good Good Good",
    feedUrl: "https://www.goodgoodgood.co/feed",
  },
  {
    vendor: "index_znanost",
    sourceName: "Index Znanost",
    feedUrl: "https://www.index.hr/rss/vijesti-znanost",
    regionCode: "hr",
    category: "Science",
  },
  {
    vendor: "index_ljubimci",
    sourceName: "Index Ljubimci",
    feedUrl: "https://www.index.hr/rss/ljubimci",
    regionCode: "hr",
    category: "Animals",
  },
  {
    vendor: "tagesschau_forschung",
    sourceName: "tagesschau Forschung",
    feedUrl: "https://www.tagesschau.de/wissen/forschung/index~rss2.xml",
    regionCode: "de",
    category: "Science",
  },
  {
    vendor: "tagesschau_klima",
    sourceName: "tagesschau Klima",
    feedUrl: "https://www.tagesschau.de/wissen/klima/index~rss2.xml",
    regionCode: "de",
    category: "Environment",
  },
  {
    vendor: "tagesschau_gesundheit",
    sourceName: "tagesschau Gesundheit",
    feedUrl: "https://www.tagesschau.de/wissen/gesundheit/index~rss2.xml",
    regionCode: "de",
    category: "Health",
  },
];

const fetchFeed = async feedUrl => {
  for (let attempt = 0; attempt <= maxRetriesPerRequest; attempt += 1) {
    try {
      const response = await fetch(feedUrl);
      const xml = await response.text();

      if (response.ok) {
        return xml;
      }

      if (attempt < maxRetriesPerRequest) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }

      throw new Error(`RSS error ${response.status}: ${feedUrl}`);
    } catch (error) {
      if (attempt < maxRetriesPerRequest) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }

      throw error;
    }
  }
};

export const run = async () => {
  const fetchedArticles = [];
  const feedErrors = [];
  const succeededFeeds = [];

  for (const feed of FEED_CONFIG) {
    if (feed.regionCode && !enabledRegionCodes.has("world") && !enabledRegionCodes.has(feed.regionCode)) {
      continue;
    }

    try {
      const xml = await fetchFeed(feed.feedUrl);
      const items = parseRssItems(xml).slice(0, maxItemsPerFeed);

      for (const item of items) {
        const regionCode = feed.regionCode || resolveRegionCode({
          title: item.title,
          description: item.description,
          content: item.content_encoded,
          tags: item.categories,
          sourceUrl: item.link,
        });

        if (!enabledRegionCodes.has("world") && !enabledRegionCodes.has(regionCode)) {
          continue;
        }

        const category = feed.category || resolveCategory({
          title: item.title,
          description: item.description,
          content: item.content_encoded,
          tags: item.categories,
        });

        const row = buildRawArticleRow({
          vendor: feed.vendor,
          sourceName: feed.sourceName,
          article: {
            url: item.link,
            title: item.title,
            description: item.description,
            content: item.content_encoded,
            publishedAt: item.pubDate,
          },
          regionCode,
          countryCode: REGION_CONFIG.find(region => region.code === regionCode)?.country || null,
          category,
          emoji: getCategoryEmoji(category),
          tags: item.categories,
          rawPayload: {
            title: item.title,
            url: item.link,
            description: item.description,
            content: item.content_encoded,
            publishedAt: item.pubDate,
            categories: item.categories,
          },
        });

        if (row) {
          fetchedArticles.push(row);
        }
      }

      succeededFeeds.push(feed.sourceName);
    } catch (error) {
      feedErrors.push({
        sourceName: feed.sourceName,
        feedUrl: feed.feedUrl,
        error: error.message,
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
    feeds: succeededFeeds,
    feedErrors,
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
