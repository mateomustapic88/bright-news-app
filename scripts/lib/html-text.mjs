const HTML_ENTITIES = new Map([
  ["&amp;", "&"],
  ["&lt;", "<"],
  ["&gt;", ">"],
  ["&quot;", "\""],
  ["&#39;", "'"],
  ["&nbsp;", " "],
  ["&rsquo;", "'"],
  ["&lsquo;", "'"],
  ["&ldquo;", "\""],
  ["&rdquo;", "\""],
  ["&ndash;", "-"],
  ["&mdash;", "-"],
  ["&hellip;", "..."],
]);

const decodeHtmlEntities = value => {
  let result = value;

  for (const [entity, replacement] of HTML_ENTITIES.entries()) {
    result = result.split(entity).join(replacement);
  }

  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));

  return result;
};

export const decodeHtmlEntitiesDeep = value => {
  let result = String(value || "");

  for (let index = 0; index < 3; index += 1) {
    const decoded = decodeHtmlEntities(result);
    if (decoded === result) break;
    result = decoded;
  }

  return result;
};

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const keywordPatternCache = new Map();

export const matchesKeyword = (haystack, keyword) => {
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
    .replace(/&lt;\/?[a-z][\w:-]*(?:[\s\S]*?)&gt;/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const toSentence = value => {
  let result = String(value || "");

  for (let index = 0; index < 4; index += 1) {
    const next = stripHtml(decodeHtmlEntitiesDeep(result))
      .replace(/\s+/g, " ")
      .trim();

    if (next === result) break;
    result = next;
  }

  return result.replace(/\s+/g, " ").trim();
};

export const normalizeHaystack = values =>
  values
    .filter(Boolean)
    .map(value => toSentence(value).toLowerCase())
    .join(" ");

export const countKeywordHits = (haystack, keywords) =>
  keywords.reduce((count, keyword) => (matchesKeyword(haystack, keyword) ? count + 1 : count), 0);
