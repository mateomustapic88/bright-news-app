import { normalizeExternalUrl } from "../../src/lib/urls.js";

export const REGION_CONFIG = [
  { code: "world", country: "", lang: "en" },
  { code: "us", country: "us", lang: "en" },
  { code: "uk", country: "gb", lang: "en" },
  { code: "hr", country: "hr", lang: "hr" },
  { code: "de", country: "de", lang: "de" },
  { code: "fr", country: "fr", lang: "fr" },
  { code: "jp", country: "jp", lang: "ja" },
  { code: "au", country: "au", lang: "en" },
  { code: "br", country: "br", lang: "pt" },
  { code: "in", country: "in", lang: "en" },
];

export const DEFAULT_INGEST_REGION_CODES = REGION_CONFIG.map(region => region.code).join(",");

export const CATEGORY_CONFIG = [
  {
    category: "Environment",
    emoji: "🌿",
    query: "\"climate restoration\" OR conservation OR reforestation OR biodiversity OR reef restoration OR wildlife recovery OR clean energy success OR emissions fall",
    localizedQueries: {
      hr: "očuvanje prirode OR pošumljavanje OR bioraznolikost OR obnova grebena OR oporavak divljih životinja OR uspjeh čiste energije OR smanjenje emisija",
      de: "Naturschutz OR Aufforstung OR Biodiversität OR Riffrestaurierung OR Erholung der Tierwelt OR Erfolg saubere Energie OR Emissionsrückgang",
      fr: "conservation OR reforestation OR biodiversité OR restauration des récifs OR retour de la faune OR succès énergie propre OR baisse des émissions",
      ja: "保全 OR 再植林 OR 生物多様性 OR サンゴ礁再生 OR 野生動物回復 OR クリーンエネルギー成功 OR 排出量減少",
      pt: "conservação OR reflorestamento OR biodiversidade OR restauração de recifes OR recuperação da vida selvagem OR sucesso da energia limpa OR queda das emissões",
    },
  },
  {
    category: "Science",
    emoji: "🔬",
    query: "scientists develop OR research breakthrough OR scientific advance OR new study shows progress OR discovery helps",
    localizedQueries: {
      hr: "znanstvenici razvili OR istraživački proboj OR znanstveni napredak OR novo istraživanje pokazuje napredak OR otkriće pomaže",
      de: "Wissenschaftler entwickeln OR Forschungsdurchbruch OR wissenschaftlicher Fortschritt OR neue Studie zeigt Fortschritt OR Entdeckung hilft",
      fr: "des scientifiques développent OR percée scientifique OR avancée scientifique OR une nouvelle étude montre des progrès OR une découverte aide",
      ja: "科学者が開発 OR 研究のブレークスルー OR 科学的進歩 OR 新しい研究が進展を示す OR 発見が役立つ",
      pt: "cientistas desenvolvem OR avanço científico OR descoberta ajuda OR nova pesquisa mostra progresso",
    },
  },
  {
    category: "Community",
    emoji: "🤝",
    query: "volunteers help OR charity success OR community project improves OR local initiative helps OR donation drive succeeds",
    localizedQueries: {
      hr: "volonteri pomažu OR uspjeh dobrotvorne akcije OR projekt zajednice poboljšava OR lokalna inicijativa pomaže OR uspješna donatorska akcija",
      de: "Freiwillige helfen OR Erfolg einer Wohltätigkeitsaktion OR Gemeinschaftsprojekt verbessert OR lokale Initiative hilft OR Spendenaktion erfolgreich",
      fr: "des bénévoles aident OR succès caritatif OR projet communautaire améliore OR initiative locale aide OR collecte de dons réussie",
      ja: "ボランティアが支援 OR 慈善活動の成功 OR 地域プロジェクトが改善 OR 地元の取り組みが役立つ OR 寄付活動が成功",
      pt: "voluntários ajudam OR sucesso beneficente OR projeto comunitário melhora OR iniciativa local ajuda OR campanha de doação bem-sucedida",
    },
  },
  {
    category: "Health",
    emoji: "💚",
    query: "health breakthrough OR treatment success OR vaccine success OR disease prevention progress OR recovery program helps",
    localizedQueries: {
      hr: "zdravstveni proboj OR uspjeh liječenja OR uspjeh cjepiva OR napredak u prevenciji bolesti OR program oporavka pomaže",
      de: "medizinischer Durchbruch OR Behandlungserfolg OR Impferfolg OR Fortschritt bei der Krankheitsprävention OR Genesungsprogramm hilft",
      fr: "percée en santé OR succès du traitement OR succès du vaccin OR progrès dans la prévention des maladies OR programme de rétablissement aide",
      ja: "医療のブレークスルー OR 治療成功 OR ワクチン成功 OR 病気予防の進展 OR 回復プログラムが役立つ",
      pt: "avanço na saúde OR sucesso no tratamento OR sucesso da vacina OR progresso na prevenção de doenças OR programa de recuperação ajuda",
    },
  },
  {
    category: "Animals",
    emoji: "🐾",
    query: "animal rescue OR wildlife recovery OR species rebound OR habitat restoration helps animals OR shelter adoption success",
    localizedQueries: {
      hr: "spašavanje životinja OR oporavak divljih životinja OR oporavak vrste OR obnova staništa pomaže životinjama OR uspjeh udomljavanja",
      de: "Tierrettung OR Erholung der Tierwelt OR Rückkehr einer Art OR Lebensraumrenaturierung hilft Tieren OR Tierheimvermittlung erfolgreich",
      fr: "sauvetage animalier OR retour de la faune OR reprise d'une espèce OR restauration de l'habitat aide les animaux OR adoption en refuge réussie",
      ja: "動物救助 OR 野生動物回復 OR 種の回復 OR 生息地の回復が動物を助ける OR 保護施設での譲渡成功",
      pt: "resgate de animais OR recuperação da vida selvagem OR recuperação de espécie OR restauração de habitat ajuda animais OR sucesso de adoção em abrigo",
    },
  },
  {
    category: "Innovation",
    emoji: "💡",
    query: "clean tech breakthrough OR battery breakthrough OR affordable technology helps OR startup solution improves lives OR AI helps detect",
    localizedQueries: {
      hr: "proboj čiste tehnologije OR proboj baterije OR pristupačna tehnologija pomaže OR startup rješenje poboljšava živote OR AI pomaže otkriti",
      de: "Durchbruch bei sauberer Technologie OR Batteriedurchbruch OR erschwingliche Technologie hilft OR Startup-Lösung verbessert Leben OR KI hilft bei der Erkennung",
      fr: "percée de la technologie propre OR percée des batteries OR technologie abordable aide OR solution de startup améliore des vies OR l'IA aide à détecter",
      ja: "クリーンテックのブレークスルー OR バッテリーのブレークスルー OR 手頃な技術が役立つ OR スタートアップの解決策が生活を改善 OR AIが検出を支援",
      pt: "avanço em tecnologia limpa OR avanço em baterias OR tecnologia acessível ajuda OR solução de startup melhora vidas OR IA ajuda a detectar",
    },
  },
];

export const TRUSTED_AUTO_APPROVE_VENDORS = new Set(["goodnewsnetwork", "positive_news"]);
const MIN_POSITIVE_SCORE = 0.6;
const hasOpenAiReviewer = Boolean(process.env.OPENAI_API_KEY);
const HEURISTIC_AUTO_APPROVE_SCORE = Number(process.env.HEURISTIC_AUTO_APPROVE_SCORE || 0.66);
const BLOCKED_SOURCE_HOSTS = [
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "youtu.be",
  "spotify.com",
  "podcasts.apple.com",
];

const NEGATIVE_KEYWORDS = [
  "war",
  "killed",
  "attack",
  "dead",
  "injured",
  "stranded",
  "disaster",
  "crash",
  "fraud",
  "scandal",
  "bomb",
  "shooting",
  "missile",
  "strike",
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
  "krieg",
  "katastrophe",
  "hochwasser",
  "wahl",
  "politik",
  "skandal",
  "krise",
  "konflikt",
  "unfall",
  "verletzt",
  "gestrandet",
  "guerre",
  "catastrophe",
  "inondation",
  "élection",
  "politique",
  "scandale",
  "crise",
  "conflit",
  "accident",
  "rat",
  "ubijen",
  "poginuo",
  "katastrofa",
  "poplava",
  "izbori",
  "politika",
  "skandal",
  "kriza",
  "sukob",
  "nesreća",
  "guerra",
  "morto",
  "mortos",
  "desastre",
  "enchente",
  "eleição",
  "política",
  "escândalo",
  "crise",
  "conflito",
  "acidente",
  "戦争",
  "死亡",
  "災害",
  "洪水",
  "選挙",
  "政治",
  "危機",
  "紛争",
  "事故",
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
  "discovered",
  "new species",
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
  "protects",
  "benefit",
  "benefits",
  "effective",
  "first success",
  "first successes",
  "uspjeh",
  "napredak",
  "oporavak",
  "spašavanje",
  "spašeni",
  "pomaže",
  "pomažu",
  "volonteri",
  "očuvanje",
  "obnova",
  "liječenje",
  "prevencija",
  "štiti",
  "koristi",
  "otkriće",
  "otkriven",
  "otkrivena",
  "otkrivene",
  "udomljavanje",
  "nova prilika",
  "sretan kraj",
  "čista energija",
  "poboljšava",
  "smanjenje",
  "erfolg",
  "erfolge",
  "fortschritt",
  "erholung",
  "rettung",
  "gerettet",
  "hilft",
  "helfen",
  "gesund",
  "gesünder",
  "vorbeugung",
  "vorbeugen",
  "schützt",
  "wirksam",
  "wirkung",
  "steigert",
  "erste erfolge",
  "behandlungserfolg",
  "freiwillige",
  "naturschutz",
  "behandlung",
  "entdeckung",
  "entdeckt",
  "saubere energie",
  "verbessert",
  "rückgang",
  "succès",
  "progrès",
  "rétablissement",
  "sauvetage",
  "sauvé",
  "aide",
  "protège",
  "prévention",
  "efficace",
  "bénéfice",
  "bénévoles",
  "conservation",
  "traitement",
  "découverte",
  "énergie propre",
  "améliore",
  "baisse",
  "sucesso",
  "progresso",
  "recuperação",
  "resgate",
  "salvo",
  "ajuda",
  "prevenção",
  "protege",
  "eficaz",
  "voluntários",
  "conservação",
  "descoberta",
  "energia limpa",
  "melhora",
  "queda",
  "成功",
  "進展",
  "回復",
  "救助",
  "救出",
  "助ける",
  "ボランティア",
  "保全",
  "発見",
  "クリーンエネルギー",
  "改善",
  "減少",
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
  hr: ["croatia", "croatian", "hrvatska", "hrvatski", "zagreb", "split", "rijeka"],
  de: ["germany", "german", "deutschland", "deutsch", "berlin", "hamburg", "munich", "münchen"],
  fr: ["france", "french", "français", "paris", "lyon", "marseille"],
  jp: ["japan", "japanese", "日本", "東京", "大阪", "京都"],
  au: ["australia", "australian"],
  br: ["brazil", "brazilian", "brasil", "brasileiro", "são paulo", "rio de janeiro"],
  in: ["india", "indian", "bharat", "delhi", "mumbai", "bengaluru", "bangalore"],
};

const DOMAIN_REGION_HINTS = {
  ".hr": "hr",
  ".de": "de",
  ".fr": "fr",
  ".jp": "jp",
  ".br": "br",
  ".in": "in",
  ".co.uk": "uk",
  ".uk": "uk",
  ".au": "au",
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

const extractTagAttributes = (block, tagName) => {
  const match = block.match(new RegExp(`<${tagName}\\b([^>]*)>`, "i"));
  if (!match) return {};

  return Object.fromEntries(
    Array.from(match[1].matchAll(/([\w:-]+)="([^"]*)"/g)).map(([, key, value]) => [key, value]),
  );
};

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const chunkArray = (items, size) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const decodeHtmlEntities = value => {
  let result = value;

  for (const [entity, replacement] of HTML_ENTITIES.entries()) {
    result = result.split(entity).join(replacement);
  }

  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));

  return result;
};

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const keywordPatternCache = new Map();

const matchesKeyword = (haystack, keyword) => {
  if (!haystack || !keyword) return false;

  if (/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+$/u.test(keyword)) {
    return haystack.includes(keyword);
  }

  let pattern = keywordPatternCache.get(keyword);
  if (!pattern) {
    pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(keyword)}(?=$|[^\\p{L}\\p{N}])`, "iu");
    keywordPatternCache.set(keyword, pattern);
  }

  return pattern.test(haystack);
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
  keywords.reduce((count, keyword) => (matchesKeyword(haystack, keyword) ? count + 1 : count), 0);

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

export const getLocalizedCategoryQuery = (categoryConfig, lang = "en") =>
  categoryConfig.localizedQueries?.[lang] || categoryConfig.query;

export const resolveRegionCode = ({ title, description, content = "", tags = [], sourceUrl = "" }) => {
  const haystack = normalizeHaystack([title, description, content, tags.join(" ")]);

  if (sourceUrl) {
    try {
      const hostname = new URL(sourceUrl).hostname.toLowerCase();
      for (const [suffix, regionCode] of Object.entries(DOMAIN_REGION_HINTS)) {
        if (hostname.endsWith(suffix)) {
          return regionCode;
        }
      }
    } catch {
      // Ignore URL parse failures and continue with text hints.
    }
  }

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
  const normalizedSourceUrl = normalizeExternalUrl(tags.find(tag => tag.startsWith?.("http")) || "");

  if (NON_NEWS_TITLE_PATTERNS.some(pattern => pattern.test(normalizedTitle))) {
    return {
      reviewStatus: "rejected",
      rejectedReason: "auto_non_news_format",
      reviewNotes: "Rejected because the item is not a current news article format.",
    };
  }

  if (NEGATIVE_KEYWORDS.some(keyword => matchesKeyword(haystack, keyword))) {
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

  if (normalizedSourceUrl) {
    try {
      const hostname = new URL(normalizedSourceUrl).hostname.toLowerCase();
      if (BLOCKED_SOURCE_HOSTS.some(blockedHost => hostname.includes(blockedHost))) {
        return {
          reviewStatus: "rejected",
          rejectedReason: "auto_blocked_source_host",
          reviewNotes: "Rejected because the source host is not a normal article publisher.",
        };
      }
    } catch {
      // Ignore invalid source URLs here.
    }
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

  if (!hasOpenAiReviewer && candidateScore >= HEURISTIC_AUTO_APPROVE_SCORE) {
    return {
      reviewStatus: "approved",
      rejectedReason: "",
      reviewNotes: `Auto-approved by heuristic score without OpenAI review (${candidateScore.toFixed(2)}).`,
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
    tags: [...tags, sourceUrl],
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

  const existingLookupChunkSize = 10;
  const upsertChunkSize = 150;
  const sourceUrls = rows.map(row => row.source_url);
  const existingRows = [];

  for (const sourceUrlChunk of chunkArray(sourceUrls, existingLookupChunkSize)) {
    const { data, error: existingError } = await supabase
      .from("raw_articles")
      .select("source_url, review_status, review_notes, rejected_reason, published_story_id")
      .in("source_url", sourceUrlChunk);

    if (existingError) {
      throw new Error(existingError.message || JSON.stringify(existingError));
    }

    existingRows.push(...(data || []));
  }

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
      const isAutoRejected = String(existing.rejected_reason || "").startsWith("auto_");
      if (isAutoRejected && row.review_status !== "rejected") {
        return {
          ...row,
          published_story_id: existing.published_story_id || null,
        };
      }

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

  for (const rowsChunk of chunkArray(rowsToUpsert, upsertChunkSize)) {
    const { error } = await supabase
      .from("raw_articles")
      .upsert(rowsChunk, { onConflict: "source_url" });

    if (error) throw new Error(error.message || JSON.stringify(error));
  }

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
    const sourceAttributes = extractTagAttributes(block, "source");

    return {
      title: extractTagValue(block, "title"),
      link: extractTagValue(block, "link"),
      description: extractTagValue(block, "description"),
      content_encoded: extractTagValue(block, "content:encoded"),
      pubDate: extractTagValue(block, "pubDate"),
      categories: extractTagValues(block, "category"),
      source: extractTagValue(block, "source"),
      source_url: sourceAttributes.url || "",
    };
  });
