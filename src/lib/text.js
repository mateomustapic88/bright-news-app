const HTML_ENTITY_MAP = new Map([
  ["&amp;", "&"],
  ["&quot;", "\""],
  ["&apos;", "'"],
  ["&#39;", "'"],
  ["&nbsp;", " "],
  ["&ndash;", "–"],
  ["&mdash;", "—"],
  ["&hellip;", "..."],
  ["&rsquo;", "'"],
  ["&lsquo;", "'"],
  ["&ldquo;", "\""],
  ["&rdquo;", "\""],
  ["&euro;", "€"],
  ["&copy;", "©"],
  ["&reg;", "®"],
  ["&trade;", "™"],
  ["&lt;", "<"],
  ["&gt;", ">"],
]);

const decodeHtmlEntities = value => {
  let result = String(value || "");

  for (const [entity, replacement] of HTML_ENTITY_MAP.entries()) {
    result = result.split(entity).join(replacement);
  }

  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));

  return result;
};

const stripHtmlTags = value =>
  String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;\/?[a-z][\w:-]*(?:[\s\S]*?)&gt;/gi, " ")
    .replace(/<[^>]*>/g, " ");

export const sanitizeText = value => {
  let result = String(value || "");

  for (let index = 0; index < 4; index += 1) {
    const next = stripHtmlTags(decodeHtmlEntities(result))
      .replace(/\s+/g, " ")
      .trim();

    if (next === result) break;
    result = next;
  }

  return result.replace(/\s+/g, " ").trim();
};
