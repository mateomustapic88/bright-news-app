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
const fetchTimeoutMs = Number(getEnv("INGEST_RSS_FETCH_TIMEOUT_MS") || 8000);
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
    vendor: "npr_science",
    sourceName: "NPR Science",
    feedUrl: "https://feeds.npr.org/1007/rss.xml",
    regionCode: "us",
    category: "Science",
  },
  {
    vendor: "npr_health",
    sourceName: "NPR Health",
    feedUrl: "https://feeds.npr.org/1128/rss.xml",
    regionCode: "us",
    category: "Health",
  },
  {
    vendor: "sciencedaily_science",
    sourceName: "ScienceDaily Science",
    feedUrl: "https://www.sciencedaily.com/rss/top/science.xml",
    regionCode: "us",
    category: "Science",
  },
  {
    vendor: "sciencedaily_health",
    sourceName: "ScienceDaily Health",
    feedUrl: "https://www.sciencedaily.com/rss/top/health.xml",
    regionCode: "us",
    category: "Health",
  },
  {
    vendor: "sciencedaily_environment",
    sourceName: "ScienceDaily Environment",
    feedUrl: "https://www.sciencedaily.com/rss/top/environment.xml",
    regionCode: "us",
    category: "Environment",
  },
  {
    vendor: "smithsonian_science",
    sourceName: "Smithsonian Science & Nature",
    feedUrl: "https://www.smithsonianmag.com/rss/science-nature/",
    regionCode: "us",
    category: "Science",
  },
  {
    vendor: "smithsonian_innovation",
    sourceName: "Smithsonian Innovation",
    feedUrl: "https://www.smithsonianmag.com/rss/innovation/",
    regionCode: "us",
    category: "Innovation",
  },
  {
    vendor: "index_znanost",
    sourceName: "Index Znanost",
    feedUrl: "https://www.index.hr/rss/vijesti-znanost",
    regionCode: "hr",
    category: "Science",
  },
  {
    vendor: "index_hrvatska",
    sourceName: "Index Hrvatska",
    feedUrl: "https://www.index.hr/rss/vijesti-hrvatska",
    regionCode: "hr",
  },
  {
    vendor: "index_zagreb",
    sourceName: "Index Zagreb",
    feedUrl: "https://www.index.hr/rss/vijesti-zagreb",
    regionCode: "hr",
    category: "Community",
  },
  {
    vendor: "index_regija",
    sourceName: "Index Regija",
    feedUrl: "https://www.index.hr/rss/vijesti-regija",
    regionCode: "hr",
  },
  {
    vendor: "index_ljubimci",
    sourceName: "Index Ljubimci",
    feedUrl: "https://www.index.hr/rss/ljubimci",
    regionCode: "hr",
    category: "Animals",
  },
  {
    vendor: "index_tech_gadget",
    sourceName: "Index Tech & Gadget",
    feedUrl: "https://www.index.hr/rss/magazin-tech-gadget",
    regionCode: "hr",
    category: "Innovation",
  },
  {
    vendor: "index_fit",
    sourceName: "Index Fit",
    feedUrl: "https://www.index.hr/rss/fit",
    regionCode: "hr",
    category: "Health",
  },
  {
    vendor: "index_food",
    sourceName: "Index Food",
    feedUrl: "https://www.index.hr/rss/food",
    regionCode: "hr",
    category: "Health",
  },
  {
    vendor: "index_chill",
    sourceName: "Index Chill",
    feedUrl: "https://www.index.hr/rss/chill",
    regionCode: "hr",
    category: "Community",
  },
  {
    vendor: "24sata_aktualno",
    sourceName: "24sata Aktualno",
    feedUrl: "https://www.24sata.hr/feeds/aktualno.xml",
    regionCode: "hr",
  },
  {
    vendor: "24sata_news",
    sourceName: "24sata News",
    feedUrl: "https://www.24sata.hr/feeds/news.xml",
    regionCode: "hr",
  },
  {
    vendor: "24sata_lifestyle",
    sourceName: "24sata Lifestyle",
    feedUrl: "https://www.24sata.hr/feeds/lifestyle.xml",
    regionCode: "hr",
    category: "Health",
  },
  {
    vendor: "24sata_tech",
    sourceName: "24sata Tech",
    feedUrl: "https://www.24sata.hr/feeds/tech.xml",
    regionCode: "hr",
    category: "Innovation",
  },
  {
    vendor: "miss7_zdrava",
    sourceName: "Miss7 Zdrava",
    feedUrl: "https://miss7zdrava.24sata.hr/feeds/axiom_feed",
    regionCode: "hr",
    category: "Health",
  },
  {
    vendor: "bug_hr",
    sourceName: "Bug.hr",
    feedUrl: "https://www.bug.hr/rss/",
    regionCode: "hr",
  },
  {
    vendor: "poslovni_hr",
    sourceName: "Poslovni dnevnik",
    feedUrl: "https://www.poslovni.hr/feed",
    regionCode: "hr",
  },
  {
    vendor: "zadarski_list",
    sourceName: "Zadarski list",
    feedUrl: "https://zadarskilist.novilist.hr/feed/",
    regionCode: "hr",
  },
  {
    vendor: "zagrebancija",
    sourceName: "Zagrebancija",
    feedUrl: "https://www.zagrebancija.com/feed/",
    regionCode: "hr",
    category: "Community",
  },
  {
    vendor: "zg_magazin",
    sourceName: "ZG-magazin",
    feedUrl: "https://zg-magazin.com.hr/feed/",
    regionCode: "hr",
    category: "Community",
  },
  {
    vendor: "01portal",
    sourceName: "01Portal",
    feedUrl: "https://01portal.hr/feed/",
    regionCode: "hr",
    category: "Community",
  },
  {
    vendor: "cityportal",
    sourceName: "Cityportal",
    feedUrl: "https://cityportal.hr/feed/",
    regionCode: "hr",
    category: "Community",
  },
  {
    vendor: "dalmacija_danas",
    sourceName: "Dalmacija Danas",
    feedUrl: "https://www.dalmacijadanas.hr/feed/",
    regionCode: "hr",
    category: "Community",
  },
  {
    vendor: "dubrovniknet",
    sourceName: "DubrovnikNet",
    feedUrl: "https://www.dubrovniknet.hr/feed/",
    regionCode: "hr",
    category: "Community",
  },
  {
    vendor: "istra24",
    sourceName: "Istra24",
    feedUrl: "https://www.istra24.hr/rss/feed",
    regionCode: "hr",
    category: "Community",
  },
  {
    vendor: "regional_express",
    sourceName: "Regional Express",
    feedUrl: "https://www.regionalexpress.hr/rss/feed",
    regionCode: "hr",
    category: "Community",
  },
  {
    vendor: "sib_hr",
    sourceName: "SiB.hr",
    feedUrl: "https://sib.net.hr/feed/",
    regionCode: "hr",
    category: "Community",
  },
  {
    vendor: "bbc_science_environment",
    sourceName: "BBC Science & Environment",
    feedUrl: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    regionCode: "uk",
  },
  {
    vendor: "bbc_health",
    sourceName: "BBC Health",
    feedUrl: "https://feeds.bbci.co.uk/news/health/rss.xml",
    regionCode: "uk",
    category: "Health",
  },
  {
    vendor: "bbc_technology",
    sourceName: "BBC Technology",
    feedUrl: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    regionCode: "uk",
    category: "Innovation",
  },
  {
    vendor: "guardian_science",
    sourceName: "The Guardian Science",
    feedUrl: "https://www.theguardian.com/science/rss",
    regionCode: "uk",
    category: "Science",
  },
  {
    vendor: "guardian_environment",
    sourceName: "The Guardian Environment",
    feedUrl: "https://www.theguardian.com/environment/rss",
    regionCode: "uk",
    category: "Environment",
  },
  {
    vendor: "guardian_technology",
    sourceName: "The Guardian Technology",
    feedUrl: "https://www.theguardian.com/uk/technology/rss",
    regionCode: "uk",
    category: "Innovation",
  },
  {
    vendor: "abc_health",
    sourceName: "ABC Health & Wellbeing",
    feedUrl: "https://www.abc.net.au/health/indexes/exclude-recipes/rss.xml",
    regionCode: "au",
    category: "Health",
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
  {
    vendor: "lemonde_sciences",
    sourceName: "Le Monde Sciences",
    feedUrl: "https://www.lemonde.fr/sciences/rss_full.xml",
    regionCode: "fr",
    category: "Science",
  },
  {
    vendor: "lemonde_planete",
    sourceName: "Le Monde Planete",
    feedUrl: "https://www.lemonde.fr/planete/rss_full.xml",
    regionCode: "fr",
    category: "Environment",
  },
  {
    vendor: "lemonde_sante",
    sourceName: "Le Monde Sante",
    feedUrl: "https://www.lemonde.fr/sante/rss_full.xml",
    regionCode: "fr",
    category: "Health",
  },
  {
    vendor: "thehindu_science",
    sourceName: "The Hindu Science",
    feedUrl: "https://www.thehindu.com/sci-tech/science/feeder/default.rss",
    regionCode: "in",
    category: "Science",
  },
  {
    vendor: "thehindu_health",
    sourceName: "The Hindu Health",
    feedUrl: "https://www.thehindu.com/sci-tech/health/feeder/default.rss",
    regionCode: "in",
    category: "Health",
  },
  {
    vendor: "g1_tecnologia",
    sourceName: "g1 Tecnologia",
    feedUrl: "https://g1.globo.com/rss/g1/tecnologia/",
    regionCode: "br",
    category: "Innovation",
  },
  {
    vendor: "g1_bemestar",
    sourceName: "g1 Bem Estar",
    feedUrl: "https://g1.globo.com/rss/g1/bemestar/",
    regionCode: "br",
    category: "Health",
  },
  {
    vendor: "g1_natureza",
    sourceName: "g1 Natureza",
    feedUrl: "https://g1.globo.com/rss/g1/natureza/",
    regionCode: "br",
    category: "Environment",
  },
  {
    vendor: "canaltech_br",
    sourceName: "Canaltech",
    feedUrl: "https://feeds.feedburner.com/canaltechbr",
    regionCode: "br",
    category: "Innovation",
  },
];

const fetchFeed = async feedUrl => {
  for (let attempt = 0; attempt <= maxRetriesPerRequest; attempt += 1) {
    try {
      const response = await fetch(feedUrl, {
        signal: AbortSignal.timeout(fetchTimeoutMs),
      });
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
