import { normalizeExternalUrl } from "../../src/lib/urls.js";

export const REGION_CONFIG = [
  { code: "world", country: "", lang: "en" },
  { code: "us", country: "us", lang: "en" },
  { code: "uk", country: "gb", lang: "en" },
  { code: "hr", country: "hr", lang: "en" },
  { code: "de", country: "de", lang: "en" },
  { code: "fr", country: "fr", lang: "en" },
  { code: "jp", country: "jp", lang: "en" },
  { code: "au", country: "au", lang: "en" },
  { code: "br", country: "br", lang: "en" },
  { code: "in", country: "in", lang: "en" },
];

export const DEFAULT_INGEST_REGION_CODES = REGION_CONFIG.map(region => region.code).join(",");

export const CATEGORY_CONFIG = [
  {
    category: "Environment",
    emoji: "🌿",
    query: "\"climate restoration\" OR conservation OR reforestation OR biodiversity OR reef restoration OR wildlife recovery OR clean energy success OR emissions fall",
  },
  {
    category: "Science",
    emoji: "🔬",
    query: "scientists develop OR research breakthrough OR scientific advance OR new study shows progress OR discovery helps",
  },
  {
    category: "Community",
    emoji: "🤝",
    query: "volunteers help OR charity success OR community project improves OR local initiative helps OR donation drive succeeds",
  },
  {
    category: "Health",
    emoji: "💚",
    query: "health breakthrough OR treatment success OR vaccine success OR disease prevention progress OR recovery program helps",
  },
  {
    category: "Animals",
    emoji: "🐾",
    query: "animal rescue OR wildlife recovery OR species rebound OR habitat restoration helps animals OR shelter adoption success",
  },
  {
    category: "Innovation",
    emoji: "💡",
    query: "clean tech breakthrough OR battery breakthrough OR affordable technology helps OR startup solution improves lives OR AI helps detect",
  },
];

export const TRUSTED_AUTO_APPROVE_VENDORS = new Set(["goodnewsnetwork", "positive_news"]);
const MIN_POSITIVE_SCORE = 0.6;
const hasOpenAiReviewer = Boolean(process.env.OPENAI_API_KEY);

const NEGATIVE_KEYWORDS = [
  "war",
  "killed",
  "attack",
  "dead",
  "disaster",
  "crash",
  "fraud",
  "scandal",
  "bomb",
  "shooting",
  "layoffs",
  "earthquake",
  "flood",
  "hurricane",
  "wildfire",
  "arrest",
  "lawsuit",
  "election",
  "politics",
  "crisis",
  "conflict",
  "protest",
  "riot",
  "opinion",
];

const BLOCKED_TOPIC_TAGS = new Set([
  "politics",
  "opinion",
  "election",
  "democracy",
  "conflict",
  "war",
  "protest",
  "riot",
]);

const NON_NEWS_TITLE_PATTERNS = [
  /^good news in history\b/i,
  /horoscope/i,
  /free will astrology/i,
];

const POSITIVE_KEYWORDS = [
  "restoration",
  "recovery",
  "recover",
  "rescued",
  "rescue",
  "improves",
  "improved",
  "improve",
  "success",
  "succeeds",
  "breakthrough",
  "progress",
  "record low",
  "historic low",
  "volunteers",
  "charity",
  "community",
  "helped",
  "helps",
  "helping",
  "saved",
  "save",
  "renewable",
  "conservation",
  "biodiversity",
  "clean energy",
  "treatment",
  "prevention",
  "species",
  "wildlife",
  "healthier",
  "adoption",
  "reforestation",
  "healthy",
];

const CATEGORY_KEYWORDS = {
  Environment: [
    "environment",
    "climate",
    "conservation",
    "reforestation",
    "biodiversity",
    "ocean",
    "marine",
    "energy",
    "renewable",
    "solar",
    "wind",
    "emissions",
    "reef",
    "soil",
    "farming",
  ],
  Science: [
    "science",
    "research",
    "researchers",
    "scientists",
    "study",
    "discovery",
    "breakthrough",
    "laboratory",
    "quantum",
  ],
  Community: [
    "community",
    "society",
    "volunteers",
    "charity",
    "youth",
    "culture",
    "education",
    "people",
    "housing",
    "neighborhood",
    "support",
    "economics",
  ],
  Health: [
    "health",
    "cancer",
    "treatment",
    "disease",
    "vaccine",
    "hospital",
    "medicine",
    "wellbeing",
    "recovery",
    "healthy",
  ],
  Animals: [
    "animal",
    "animals",
    "wildlife",
    "species",
    "rescue",
    "rhino",
    "marine life",
    "habitat",
    "shelter",
    "rewilding",
  ],
  Innovation: [
    "technology",
    "innovation",
    "startup",
    "battery",
    "ai",
    "robotics",
    "engineering",
    "digital",
    "prototype",
  ],
};

const REGION_HINTS = {
  us: ["united states", "usa", "u.s.", "america", "american"],
  uk: ["united kingdom", "uk", "britain", "british", "england", "scotland", "wales"],
  hr: ["croatia", "croatian"],
  de: ["germany", "german"],
  fr: ["france", "french"],
  jp: ["japan", "japanese"],
  au: ["australia", "australian"],
  br: ["brazil", "brazilian"],
  in: ["india", "indian"],
};

const HTML_ENTITIES = new Map([
  ["&amp;", "&"],
  ["&quot;", "\""],
  ["&#39;", "'"],
  ["&apos;", "'"],
  ["&nbsp;", " "],
  ["&ndash;", "-"],
  ["&mdash;", "-"],
  ["&hellip;", "..."],
]);

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const decodeHtmlEntities = value => {
  let result = value;

  for (const [entity, replacement] of HTML_ENTITIES.entries()) {
    result = result.split(entity).join(replacement);
  }

  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));

  return result;
};

export const stripHtml = value =>
  String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const toSentence = value =>
  decodeHtmlEntities(stripHtml(value || ""))
    .replace(/\s+/g, " ")
    .trim();

const normalizeHaystack = values =>
  values
    .filter(Boolean)
    .map(value => toSentence(value).toLowerCase())
    .join(" ");

const countKeywordHits = (haystack, keywords) =>
  keywords.reduce((count, keyword) => (haystack.includes(keyword) ? count + 1 : count), 0);

export const resolveCategory = ({ title, description, content = "", tags = [] }) => {
  const haystack = normalizeHaystack([title, description, content, tags.join(" ")]);
  const scores = Object.entries(CATEGORY_KEYWORDS).map(([category, keywords]) => ({
    category,
    score: countKeywordHits(haystack, keywords),
  }));

  scores.sort((left, right) => right.score - left.score);
  return scores[0]?.score ? scores[0].category : "Community";
};

export const getCategoryEmoji = category =>
  CATEGORY_CONFIG.find(item => item.category === category)?.emoji || "✨";

export const resolveRegionCode = ({ title, description, content = "", tags = [] }) => {
  const haystack = normalizeHaystack([title, description, content, tags.join(" ")]);

  for (const [regionCode, hints] of Object.entries(REGION_HINTS)) {
    if (hints.some(hint => haystack.includes(hint))) {
      return regionCode;
    }
  }

  return "world";
};

export const inferReviewDecision = ({ vendor, title, description, content = "", tags = [] }) => {
  const haystack = normalizeHaystack([title, description, content, tags.join(" ")]);
  const normalizedTags = tags.map(tag => toSentence(tag).toLowerCase());
  const normalizedTitle = toSentence(title).toLowerCase();

  if (NON_NEWS_TITLE_PATTERNS.some(pattern => pattern.test(normalizedTitle))) {
    return {
      reviewStatus: "rejected",
      rejectedReason: "auto_non_news_format",
      reviewNotes: "Rejected because the item is not a current news article format.",
    };
  }

  if (NEGATIVE_KEYWORDS.some(keyword => haystack.includes(keyword))) {
    return {
      reviewStatus: "rejected",
      rejectedReason: "auto_negative_keyword_filter",
      reviewNotes: "Rejected by negative keyword heuristic.",
    };
  }

  if (normalizedTags.some(tag => BLOCKED_TOPIC_TAGS.has(tag))) {
    return {
      reviewStatus: "rejected",
      rejectedReason: "auto_blocked_topic_tag",
      reviewNotes: "Rejected because the source tagged it as politics/opinion/conflict.",
    };
  }

  const positiveScore = countKeywordHits(haystack, POSITIVE_KEYWORDS);
  const candidateScore = Math.min(1, positiveScore / 3);
  const isTrustedVendor = TRUSTED_AUTO_APPROVE_VENDORS.has(vendor);

  if (isTrustedVendor && !hasOpenAiReviewer) {
    return {
      reviewStatus: "approved",
      rejectedReason: "",
      reviewNotes: `Auto-approved from trusted curated source without OpenAI review (${candidateScore.toFixed(2)}).`,
    };
  }

  if (!isTrustedVendor && candidateScore < MIN_POSITIVE_SCORE) {
    return {
      reviewStatus: "rejected",
      rejectedReason: "auto_low_positive_score",
      reviewNotes: `Rejected by heuristic score (${candidateScore.toFixed(2)}).`,
    };
  }

  return {
    reviewStatus: "pending",
    rejectedReason: "",
    reviewNotes: `Awaiting OpenAI review. Heuristic score: ${candidateScore.toFixed(2)}.`,
  };
};

export const buildRawArticleRow = ({
  vendor,
  sourceName,
  article,
  regionCode,
  countryCode = null,
  category,
  emoji,
  tags = [],
  rawPayload = article,
}) => {
  const sourceUrl = normalizeExternalUrl(article.url || article.link || article.source_url);
  if (!sourceUrl) return null;

  const title = toSentence(article.title);
  if (!title) return null;

  const description = toSentence(article.description || article.summary || "");
  const content = toSentence(article.content || article.content_encoded || "");
  const decision = inferReviewDecision({
    vendor,
    title,
    description,
    content,
    tags,
  });

  return {
    vendor,
    external_id: sourceUrl,
    source_url: sourceUrl,
    source_name: sourceName || article.source_name || "",
    title,
    description,
    content,
    image_url: normalizeExternalUrl(article.image || article.image_url || "") || "",
    published_at: article.publishedAt || article.published_at || article.pubDate || null,
    region_code: regionCode,
    country_code: countryCode,
    category,
    emoji,
    review_status: decision.reviewStatus,
    review_notes: decision.reviewNotes,
    rejected_reason: decision.rejectedReason,
    raw_payload: rawPayload,
  };
};

export const dedupeBySourceUrl = rows =>
  Array.from(
    rows.reduce((acc, row) => {
      const existing = acc.get(row.source_url);
      if (!existing) {
        acc.set(row.source_url, row);
        return acc;
      }

      if (existing.region_code === "world" && row.region_code !== "world") {
        acc.set(row.source_url, row);
      }

      if (existing.review_status === "pending" && row.review_status === "approved") {
        acc.set(row.source_url, row);
      }

      return acc;
    }, new Map()).values(),
  );

export const upsertRawArticles = async (supabase, rows) => {
  if (rows.length === 0) return 0;

  const sourceUrls = rows.map(row => row.source_url);
  const { data: existingRows, error: existingError } = await supabase
    .from("raw_articles")
    .select("source_url, review_status, review_notes, rejected_reason, published_story_id")
    .in("source_url", sourceUrls);

  if (existingError) throw new Error(existingError.message);

  const existingBySourceUrl = new Map((existingRows || []).map(row => [row.source_url, row]));
  const rowsToUpsert = rows.map(row => {
    const existing = existingBySourceUrl.get(row.source_url);
    if (!existing) return row;

    if (existing.review_status === "published") {
      return {
        ...row,
        review_status: "published",
        review_notes: existing.review_notes || row.review_notes,
        rejected_reason: "",
        published_story_id: existing.published_story_id || null,
      };
    }

    if (existing.review_status === "rejected") {
      return {
        ...row,
        review_status: "rejected",
        review_notes: existing.review_notes || row.review_notes,
        rejected_reason: existing.rejected_reason || row.rejected_reason,
        published_story_id: existing.published_story_id || null,
      };
    }

    if (existing.review_status === "approved" && row.review_status === "pending") {
      return {
        ...row,
        review_status: "approved",
        review_notes: existing.review_notes || row.review_notes,
        rejected_reason: "",
        published_story_id: existing.published_story_id || null,
      };
    }

    return {
      ...row,
      review_notes: existing.review_notes || row.review_notes,
      rejected_reason: row.review_status === "rejected" ? row.rejected_reason : "",
      published_story_id: existing.published_story_id || null,
    };
  });

  const { error } = await supabase
    .from("raw_articles")
    .upsert(rowsToUpsert, { onConflict: "source_url" });

  if (error) throw new Error(error.message);

  return rowsToUpsert.length;
};

const extractTagValue = (block, tagName) => {
  const match = block.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i"));
  return match ? toSentence(match[1]) : "";
};

const extractTagValues = (block, tagName) =>
  Array.from(block.matchAll(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "gi")))
    .map(match => toSentence(match[1]))
    .filter(Boolean);

export const parseRssItems = xml =>
  Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)).map(match => {
    const block = match[0];
    return {
      title: extractTagValue(block, "title"),
      link: extractTagValue(block, "link"),
      description: extractTagValue(block, "description"),
      content_encoded: extractTagValue(block, "content:encoded"),
      pubDate: extractTagValue(block, "pubDate"),
      categories: extractTagValues(block, "category"),
    };
  });
