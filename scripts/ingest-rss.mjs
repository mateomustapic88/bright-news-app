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
    vendor: "yes_magazine",
    sourceName: "YES! Magazine",
    feedUrl: "https://www.yesmagazine.org/feed",
    regionCode: "world",
    category: "Community",
  },
  {
    vendor: "nasa_news",
    sourceName: "NASA News",
    feedUrl: "https://www.nasa.gov/news-release/feed/",
    regionCode: "world",
    category: "Science",
  },
  {
    vendor: "esa_news",
    sourceName: "ESA News",
    feedUrl: "https://www.esa.int/rssfeed/Our_Activities",
    regionCode: "world",
    category: "Science",
  },
  {
    vendor: "mongabay",
    sourceName: "Mongabay",
    feedUrl: "https://news.mongabay.com/feed/",
    regionCode: "world",
    category: "Environment",
  },
  {
    vendor: "un_news",
    sourceName: "UN News",
    feedUrl: "https://news.un.org/feed/subscribe/en/news/all/rss.xml",
    regionCode: "world",
  },
  {
    vendor: "who_news",
    sourceName: "WHO News",
    feedUrl: "https://www.who.int/rss-feeds/news-english.xml",
    regionCode: "world",
    category: "Health",
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
    vendor: "sciencedaily_technology",
    sourceName: "ScienceDaily Technology",
    feedUrl: "https://www.sciencedaily.com/rss/top/technology.xml",
    regionCode: "us",
    category: "Innovation",
  },
  {
    vendor: "mit_news",
    sourceName: "MIT News",
    feedUrl: "https://news.mit.edu/rss/feed",
    regionCode: "us",
    category: "Innovation",
  },
  {
    vendor: "conversation_us",
    sourceName: "The Conversation US",
    feedUrl: "https://theconversation.com/us/articles.atom",
    regionCode: "us",
  },
  {
    vendor: "futurity_us",
    sourceName: "Futurity",
    feedUrl: "https://www.futurity.org/feed/",
    regionCode: "us",
    category: "Science",
  },
  {
    vendor: "ars_technica_science_us",
    sourceName: "Ars Technica Science",
    feedUrl: "https://feeds.arstechnica.com/arstechnica/science",
    regionCode: "us",
    category: "Science",
  },
  {
    vendor: "medical_xpress_us",
    sourceName: "Medical Xpress",
    feedUrl: "https://medicalxpress.com/rss-feed/",
    regionCode: "us",
    category: "Health",
  },
  {
    vendor: "phys_org_us",
    sourceName: "Phys.org",
    feedUrl: "https://phys.org/rss-feed/",
    regionCode: "us",
    category: "Science",
  },
  {
    vendor: "yale_climate_connections_us",
    sourceName: "Yale Climate Connections",
    feedUrl: "https://yaleclimateconnections.org/feed/",
    regionCode: "us",
    category: "Environment",
  },
  {
    vendor: "niehs_news_us",
    sourceName: "National Institute of Environmental Health Sciences",
    feedUrl: "https://www.niehs.nih.gov/news/newsroom/rssfeed/rss_news.xml",
    regionCode: "us",
    category: "Environment",
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
    vendor: "telegram_hr",
    sourceName: "Telegram",
    feedUrl: "https://www.telegram.hr/feed/",
    regionCode: "hr",
  },
  {
    vendor: "vecernji_hr",
    sourceName: "Večernji list",
    feedUrl: "https://www.vecernji.hr/rss",
    regionCode: "hr",
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
    vendor: "n1_slovenija",
    sourceName: "N1 Slovenija",
    feedUrl: "https://n1info.si/feed/",
    regionCode: "si",
  },
  {
    vendor: "delo_si",
    sourceName: "Delo",
    feedUrl: "https://www.delo.si/rss",
    regionCode: "si",
  },
  {
    vendor: "rtv_slo",
    sourceName: "RTV Slovenija",
    feedUrl: "https://www.rtvslo.si/feeds/01.xml",
    regionCode: "si",
  },
  {
    vendor: "slo_tech",
    sourceName: "Slo-Tech",
    feedUrl: "https://static.slo-tech.com/slotech.xml",
    regionCode: "si",
    category: "Innovation",
  },
  {
    vendor: "stat_si_environment",
    sourceName: "Statistični urad RS - Okolje",
    feedUrl: "https://www.stat.si/statweb/rss/rss?days=7&fields=13",
    regionCode: "si",
    category: "Planet",
  },
  {
    vendor: "stat_si_development_technology",
    sourceName: "Statistični urad RS - Razvoj in tehnologija",
    feedUrl: "https://www.stat.si/statweb/rss/rss?days=7&fields=25",
    regionCode: "si",
    category: "Innovation",
  },
  {
    vendor: "stat_si_quality_life",
    sourceName: "Statistični urad RS - Kakovost življenja",
    feedUrl: "https://www.stat.si/statweb/rss/rss?days=7&fields=10",
    regionCode: "si",
    category: "Community",
  },
  {
    vendor: "n1_srbija",
    sourceName: "N1 Srbija",
    feedUrl: "https://n1info.rs/feed/",
    regionCode: "rs",
  },
  {
    vendor: "nova_rs",
    sourceName: "Nova.rs",
    feedUrl: "https://nova.rs/feed/",
    regionCode: "rs",
  },
  {
    vendor: "b92_zdravlje",
    sourceName: "B92 Zdravlje",
    feedUrl: "https://www.b92.net/rss/b92/zdravlje",
    regionCode: "rs",
    category: "Health",
  },
  {
    vendor: "b92_zivot",
    sourceName: "B92 Život",
    feedUrl: "https://www.b92.net/rss/b92/zivot",
    regionCode: "rs",
    category: "Community",
  },
  {
    vendor: "euronews_rs_nauka",
    sourceName: "Euronews Srbija - Nauka",
    feedUrl: "https://www.euronews.rs/rss/magazin/nauka",
    regionCode: "rs",
    category: "Science",
  },
  {
    vendor: "euronews_rs_tehnologija",
    sourceName: "Euronews Srbija - Tehnologija",
    feedUrl: "https://www.euronews.rs/rss/magazin/tehnologija",
    regionCode: "rs",
    category: "Innovation",
  },
  {
    vendor: "euronews_rs_zdravlje",
    sourceName: "Euronews Srbija - Zdravlje",
    feedUrl: "https://www.euronews.rs/rss/magazin/zdravlje",
    regionCode: "rs",
    category: "Health",
  },
  {
    vendor: "b92_tehnopolis",
    sourceName: "B92 Tehnopolis",
    feedUrl: "https://www.b92.net/rss/b92/tehnopolis",
    regionCode: "rs",
    category: "Innovation",
  },
  {
    vendor: "b92_putovanja",
    sourceName: "B92 Putovanja",
    feedUrl: "https://www.b92.net/rss/putovanja",
    regionCode: "rs",
    category: "Community",
  },
  {
    vendor: "danas_rs",
    sourceName: "Danas",
    feedUrl: "https://www.danas.rs/feed/",
    regionCode: "rs",
  },
  {
    vendor: "klix_ba",
    sourceName: "Klix",
    feedUrl: "https://www.klix.ba/rss",
    regionCode: "ba",
  },
  {
    vendor: "capital_ba",
    sourceName: "Capital.ba",
    feedUrl: "https://capital.ba/feed/",
    regionCode: "ba",
    category: "Innovation",
  },
  {
    vendor: "radiosarajevo_ba",
    sourceName: "Radio Sarajevo",
    feedUrl: "https://radiosarajevo.ba/rss",
    regionCode: "ba",
  },
  {
    vendor: "zdraviportal_ba",
    sourceName: "Zdravi portal",
    feedUrl: "https://zdraviportal.ba/feed/",
    regionCode: "ba",
    category: "Health",
  },
  {
    vendor: "novasloboda_ba",
    sourceName: "Nova Sloboda",
    feedUrl: "https://novasloboda.ba/feed/",
    regionCode: "ba",
    category: "Community",
  },
  {
    vendor: "nezavisne_kultura",
    sourceName: "Nezavisne Kultura",
    feedUrl: "https://www.nezavisne.com/rss/kultura",
    regionCode: "ba",
    category: "Community",
  },
  {
    vendor: "avaz_ba",
    sourceName: "Dnevni avaz",
    feedUrl: "https://avaz.ba/rss",
    regionCode: "ba",
  },
  {
    vendor: "buka_ba",
    sourceName: "Buka",
    feedUrl: "https://6yka.com/feed/",
    regionCode: "ba",
  },
  {
    vendor: "haber_humanost_ba",
    sourceName: "Haber.ba Humanost",
    feedUrl: "https://www.haber.ba/vijesti/humanost/feed",
    regionCode: "ba",
    category: "Community",
  },
  {
    vendor: "haber_zdravlje_ba",
    sourceName: "Haber.ba Zdravlje",
    feedUrl: "https://www.haber.ba/lifestyle/zdravlje/feed",
    regionCode: "ba",
    category: "Health",
  },
  {
    vendor: "haber_nauka_ba",
    sourceName: "Haber.ba Nauka",
    feedUrl: "https://www.haber.ba/sci-tech/nauka/feed",
    regionCode: "ba",
    category: "Science",
  },
  {
    vendor: "haber_tech_ba",
    sourceName: "Haber.ba Kompjuteri i gadgeti",
    feedUrl: "https://www.haber.ba/sci-tech/kompjuteri-gadgeti/feed",
    regionCode: "ba",
    category: "Innovation",
  },
  {
    vendor: "oslobodjenje_zdravlje_ba",
    sourceName: "Oslobođenje Zdravlje",
    feedUrl: "https://www.oslobodjenje.ba/rss/zdravlje.xml",
    regionCode: "ba",
    category: "Health",
  },
  {
    vendor: "oslobodjenje_magazin_ba",
    sourceName: "Oslobođenje Magazin",
    feedUrl: "https://www.oslobodjenje.ba/rss/magazin.xml",
    regionCode: "ba",
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
    vendor: "conversation_uk",
    sourceName: "The Conversation UK",
    feedUrl: "https://theconversation.com/uk/articles.atom",
    regionCode: "uk",
  },
  {
    vendor: "ukri_news_uk",
    sourceName: "UKRI News",
    feedUrl: "https://www.ukri.org/news/feed/",
    regionCode: "uk",
    category: "Science",
  },
  {
    vendor: "ukri_blog_uk",
    sourceName: "UKRI Blog",
    feedUrl: "https://www.ukri.org/blog/feed/",
    regionCode: "uk",
    category: "Science",
  },
  {
    vendor: "nhs_england_news_uk",
    sourceName: "NHS England News",
    feedUrl: "https://www.england.nhs.uk/feed/",
    regionCode: "uk",
    category: "Health",
  },
  {
    vendor: "science_museum_blog_uk",
    sourceName: "Science Museum Blog",
    feedUrl: "https://blog.sciencemuseum.org.uk/feed/",
    regionCode: "uk",
    category: "Science",
  },
  {
    vendor: "abc_health",
    sourceName: "ABC Health & Wellbeing",
    feedUrl: "https://www.abc.net.au/health/indexes/exclude-recipes/rss.xml",
    regionCode: "au",
    category: "Health",
  },
  {
    vendor: "abc_news_au",
    sourceName: "ABC News Australia",
    feedUrl: "https://www.abc.net.au/news/feed/51120/rss.xml",
    regionCode: "au",
  },
  {
    vendor: "guardian_au_health",
    sourceName: "The Guardian Australia Health",
    feedUrl: "https://www.theguardian.com/australia-news/health/rss",
    regionCode: "au",
    category: "Health",
  },
  {
    vendor: "sbs_news_au",
    sourceName: "SBS News",
    feedUrl: "https://www.sbs.com.au/news/feed",
    regionCode: "au",
  },
  {
    vendor: "conversation_au",
    sourceName: "The Conversation Australia",
    feedUrl: "https://theconversation.com/au/articles.atom",
    regionCode: "au",
  },
  {
    vendor: "nhk_science_medical",
    sourceName: "NHK Science & Medical",
    feedUrl: "https://www3.nhk.or.jp/rss/news/cat3.xml",
    regionCode: "jp",
    category: "Science",
  },
  {
    vendor: "asahi_science",
    sourceName: "Asahi Tech & Science",
    feedUrl: "https://www.asahi.com/rss/asahi/science.rdf",
    regionCode: "jp",
    category: "Science",
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
    vendor: "deutschlandfunk_wissen",
    sourceName: "Deutschlandfunk Wissen",
    feedUrl: "https://www.deutschlandfunk.de/wissen-106.rss",
    regionCode: "de",
    category: "Science",
  },
  {
    vendor: "deutschlandfunkkultur_wissenschaft",
    sourceName: "Deutschlandfunk Kultur Wissenschaft",
    feedUrl: "https://www.deutschlandfunkkultur.de/wissenschaft-108.rss",
    regionCode: "de",
    category: "Science",
  },
  {
    vendor: "deutschlandfunkkultur_umwelt",
    sourceName: "Deutschlandfunk Kultur Umwelt",
    feedUrl: "https://www.deutschlandfunkkultur.de/umwelt-104.rss",
    regionCode: "de",
    category: "Environment",
  },
  {
    vendor: "heise_news",
    sourceName: "heise online",
    feedUrl: "https://www.heise.de/rss/heise-atom.xml",
    regionCode: "de",
    category: "Innovation",
  },
  {
    vendor: "spektrum_de",
    sourceName: "Spektrum.de",
    feedUrl: "https://www.spektrum.de/alias/rss/spektrum-de-rss-feed/996406",
    regionCode: "de",
    category: "Science",
  },
  {
    vendor: "wissenschaft_de",
    sourceName: "wissenschaft.de",
    feedUrl: "https://www.wissenschaft.de/feed/",
    regionCode: "de",
    category: "Science",
  },
  {
    vendor: "quarks_de",
    sourceName: "Quarks",
    feedUrl: "https://www.quarks.de/feed/",
    regionCode: "de",
    category: "Science",
  },
  {
    vendor: "rki_de",
    sourceName: "Robert Koch-Institut",
    feedUrl: "https://edoc.rki.de/feed/atom_1.0/site",
    regionCode: "de",
    category: "Health",
  },
  {
    vendor: "dw_wissenschaft_de",
    sourceName: "DW Wissenschaft",
    feedUrl: "https://rss.dw.com/rdf/rss-de-wissenschaft",
    regionCode: "de",
    category: "Science",
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
    vendor: "globalnews_health_ca",
    sourceName: "Global News Health",
    feedUrl: "https://globalnews.ca/health/feed/",
    regionCode: "ca",
    category: "Health",
  },
  {
    vendor: "globalnews_environment_ca",
    sourceName: "Global News Environment",
    feedUrl: "https://globalnews.ca/environment/feed/",
    regionCode: "ca",
    category: "Environment",
  },
  {
    vendor: "globalnews_sports_ca",
    sourceName: "Global News Sports",
    feedUrl: "https://globalnews.ca/sports/feed/",
    regionCode: "ca",
    category: "Sports",
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
    vendor: "thehindu_environment_in",
    sourceName: "The Hindu Environment",
    feedUrl: "https://www.thehindu.com/sci-tech/energy-and-environment/feeder/default.rss",
    regionCode: "in",
    category: "Environment",
  },
  {
    vendor: "thehindu_technology_in",
    sourceName: "The Hindu Technology",
    feedUrl: "https://www.thehindu.com/sci-tech/technology/feeder/default.rss",
    regionCode: "in",
    category: "Innovation",
  },
  {
    vendor: "thebetterindia",
    sourceName: "The Better India",
    feedUrl: "https://thebetterindia.com/rss",
    regionCode: "in",
    category: "Community",
  },
  {
    vendor: "mongabay_india",
    sourceName: "Mongabay India",
    feedUrl: "https://india.mongabay.com/feed/",
    regionCode: "in",
    category: "Environment",
  },
  {
    vendor: "thewire_science_in",
    sourceName: "The Wire Science",
    feedUrl: "https://science.thewire.in/feed/",
    regionCode: "in",
    category: "Science",
  },
  {
    vendor: "yourstory",
    sourceName: "YourStory",
    feedUrl: "https://yourstory.com/feed",
    regionCode: "in",
    category: "Innovation",
  },
  {
    vendor: "indiabioscience",
    sourceName: "IndiaBioscience",
    feedUrl: "https://indiabioscience.org/feed",
    regionCode: "in",
    category: "Science",
  },
  {
    vendor: "citizenmatters_in",
    sourceName: "Citizen Matters",
    feedUrl: "https://citizenmatters.in/feed/",
    regionCode: "in",
    category: "Community",
  },
  {
    vendor: "malay_mail_malaysia",
    sourceName: "Malay Mail Malaysia",
    feedUrl: "https://www.malaymail.com/feed/rss/malaysia",
    regionCode: "my",
  },
  {
    vendor: "malay_mail_life",
    sourceName: "Malay Mail Life",
    feedUrl: "https://www.malaymail.com/feed/rss/life",
    regionCode: "my",
    category: "Community",
  },
  {
    vendor: "astro_awani_en_latest",
    sourceName: "Astro Awani English",
    feedUrl: "https://www.astroawani.com/rss/latest/en/public",
    regionCode: "my",
  },
  {
    vendor: "astro_awani_en_malaysia",
    sourceName: "Astro Awani Malaysia",
    feedUrl: "https://www.astroawani.com/rss/national/en/public",
    regionCode: "my",
  },
  {
    vendor: "astro_awani_en_technology",
    sourceName: "Astro Awani Technology",
    feedUrl: "https://www.astroawani.com/rss/gadgets/en/public",
    regionCode: "my",
    category: "Innovation",
  },
  {
    vendor: "astro_awani_en_lifestyle",
    sourceName: "Astro Awani Lifestyle",
    feedUrl: "https://www.astroawani.com/rss/lifestyle/en/public",
    regionCode: "my",
    category: "Community",
  },
  {
    vendor: "malaysiakini_en",
    sourceName: "Malaysiakini",
    feedUrl: "https://www.malaysiakini.com/rss/en/news",
    regionCode: "my",
  },
  {
    vendor: "free_malaysia_today",
    sourceName: "Free Malaysia Today",
    feedUrl: "https://www.freemalaysiatoday.com/feed/",
    regionCode: "my",
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
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
          Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
          "Accept-Language": "hr-HR,hr;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
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

        const row = await buildRawArticleRow({
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
