import { normalizeExternalUrl } from "../../src/lib/urls.js";
import { isBlockedStoryImageUrl, isLikelyBrandingImageUrl } from "../../src/lib/storyImages.js";
import { decodeHtmlEntitiesDeep } from "./html-text.mjs";

const IMAGE_FILE_PATTERN = /^https?:\/\/\S+\.(?:jpe?g|png|webp|gif|avif|svg)(?:\?\S*)?$/i;
const IMAGE_RICH_FORMAT_PATTERN = /\.(?:jpe?g|png|webp|avif)(?:\?\S*)?$/i;
const IMAGE_VECTOR_PATTERN = /\.svg(?:\?\S*)?$/i;
const IMAGE_THUMBNAIL_PATTERN = /(?:thumb|thumbnail|small|tiny|icon|avatar|placeholder|default|1x1|spacer|pixel)/i;
const IMAGE_UPLOAD_HINT_PATTERN = /(?:wp-content\/uploads|\/uploads\/|\/media\/|\/images\/|\/photo\/|\/photos\/|cloudinary|imgix)/i;
const HTML_IMAGE_META_KEYS = new Set([
  "og:image",
  "og:image:url",
  "twitter:image",
  "twitter:image:src",
  "image",
  "thumbnailurl",
]);
const CLOUDINARY_IMAGE_PATTERN = /\/image\/upload\//i;
const TRANSFORMED_IMAGE_PATTERN = /\/f_(?:jpe?g|png|webp|gif|avif)\b/i;
const IMAGE_QUERY_HINT_PATTERN = /[?&](?:format|fm|width|height|resize|crop|quality)=/i;
const ATTRIBUTE_CACHE = new Map();

export const isLikelyImageUrl = value => {
  const normalized = normalizeExternalUrl(value || "");
  if (!normalized) return false;

  if (IMAGE_FILE_PATTERN.test(normalized)) return true;
  if (CLOUDINARY_IMAGE_PATTERN.test(normalized)) return true;
  if (TRANSFORMED_IMAGE_PATTERN.test(normalized)) return true;
  return IMAGE_QUERY_HINT_PATTERN.test(normalized);
};

const resolveImageCandidateUrl = (value, baseUrl = "") => {
  const rawValue = String(value || "").trim();
  if (!rawValue || /^data:/i.test(rawValue)) return "";

  if (baseUrl && !rawValue.startsWith("//") && !/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(rawValue)) {
    try {
      return normalizeExternalUrl(new URL(rawValue, baseUrl).toString());
    } catch {
      return "";
    }
  }

  return normalizeExternalUrl(rawValue);
};

const extractAttributeValue = (tag, attributeName) => {
  const cacheKey = `${attributeName}`;
  let matcher = ATTRIBUTE_CACHE.get(cacheKey);

  if (!matcher) {
    const escapedAttributeName = attributeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    matcher = new RegExp(`${escapedAttributeName}\\s*=\\s*["']([^"']+)["']`, "i");
    ATTRIBUTE_CACHE.set(cacheKey, matcher);
  }

  const match = tag.match(matcher);
  return match?.[1] || "";
};

const extractSrcsetUrl = value => {
  const firstSource = String(value || "")
    .split(",")
    .map(part => part.trim())
    .find(Boolean);

  if (!firstSource) return "";
  return firstSource.split(/\s+/)[0] || "";
};

export const resolveHtmlImageCandidate = (value, baseUrl = "") => {
  const candidate = resolveImageCandidateUrl(value, baseUrl);
  if (!isLikelyImageUrl(candidate)) return "";
  if (isBlockedStoryImageUrl(candidate)) return "";
  return candidate;
};

const getImageCandidateScore = (value, source = "unknown") => {
  const candidate = normalizeExternalUrl(value || "");
  if (!candidate) return -Infinity;

  let score = 0;

  if (source === "meta") score += 5;
  if (source === "link") score += 4;
  if (source === "img") score += 3;
  if (source === "payload") score += 3;
  if (source === "text") score += 1;

  if (IMAGE_RICH_FORMAT_PATTERN.test(candidate)) score += 3;
  if (IMAGE_UPLOAD_HINT_PATTERN.test(candidate)) score += 2;
  if (/[\?&](?:w|width|h|height)=([2-9]\d{2,}|\d{4,})/i.test(candidate)) score += 1;
  if (/[\?&](?:fit|crop|fm|format)=/i.test(candidate)) score += 0.5;

  if (IMAGE_VECTOR_PATTERN.test(candidate)) score -= 3;
  if (IMAGE_THUMBNAIL_PATTERN.test(candidate)) score -= 2;
  if (isLikelyBrandingImageUrl(candidate)) score -= 5;

  return score;
};

const selectBestImageCandidate = (candidates, baseUrl = "") =>
  candidates
    .map(candidate => ({
      url: resolveHtmlImageCandidate(candidate.url, baseUrl),
      source: candidate.source || "unknown",
    }))
    .filter(candidate => candidate.url)
    .sort((left, right) => getImageCandidateScore(right.url, right.source) - getImageCandidateScore(left.url, left.source))[0]?.url || "";

export const extractImageUrlFromHtml = (value, baseUrl = "") => {
  const input = decodeHtmlEntitiesDeep(String(value || ""));
  if (!input) return "";
  const candidates = [];

  for (const match of input.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const key =
      extractAttributeValue(tag, "property") ||
      extractAttributeValue(tag, "name") ||
      extractAttributeValue(tag, "itemprop");

    if (!HTML_IMAGE_META_KEYS.has(String(key || "").toLowerCase())) continue;

    candidates.push({
      source: "meta",
      url: extractAttributeValue(tag, "content"),
    });
  }

  for (const match of input.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = extractAttributeValue(tag, "rel").toLowerCase();
    if (!["image_src", "preload"].includes(rel)) continue;

    candidates.push({
      source: "link",
      url: extractAttributeValue(tag, "href") || extractAttributeValue(tag, "imagesrc"),
    });
  }

  for (const match of input.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const tagCandidates = [
      extractAttributeValue(tag, "src"),
      extractAttributeValue(tag, "data-src"),
      extractAttributeValue(tag, "data-lazy-src"),
      extractAttributeValue(tag, "data-original"),
      extractSrcsetUrl(extractAttributeValue(tag, "srcset")),
      extractSrcsetUrl(extractAttributeValue(tag, "data-srcset")),
    ];

    for (const candidateValue of tagCandidates) {
      candidates.push({
        source: "img",
        url: candidateValue,
      });
    }
  }

  const urlMatches = input.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  for (const match of urlMatches) {
    candidates.push({
      source: "text",
      url: match,
    });
  }

  return selectBestImageCandidate(candidates, baseUrl);
};

export const extractImageUrlFromPayload = payload => {
  const seen = new Set();
  const queue = [payload];
  let queueIndex = 0;

  while (queueIndex < queue.length) {
    const current = queue[queueIndex];
    queueIndex += 1;
    if (!current || seen.has(current)) continue;
    seen.add(current);

    if (typeof current === "string") {
      const fromHtml = extractImageUrlFromHtml(current);
      if (fromHtml) return fromHtml;

      const normalized = resolveHtmlImageCandidate(current);
      if (normalized) return normalized;
      continue;
    }

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    if (typeof current === "object") {
      const prioritizedKeys = [
        "image",
        "image_url",
        "imageUrl",
        "media",
        "media_url",
        "mediaUrl",
        "media_thumbnail",
        "mediaThumbnail",
        "thumbnail",
        "thumbnail_url",
        "thumbnailUrl",
        "enclosure",
        "enclosures",
        "hero_image",
        "heroImage",
      ];

      for (const key of prioritizedKeys) {
        if (!(key in current)) continue;
        const candidate = extractImageUrlFromPayload(current[key]);
        if (candidate) return candidate;
      }

      queue.push(...Object.values(current));
    }
  }

  return "";
};

export const extractImageUrlFromArticle = article => {
  const directImageCandidates = [];
  const directCandidates = [
    article?.image,
    article?.image_url,
    article?.imageUrl,
    article?.media,
    article?.media_url,
    article?.mediaUrl,
    article?.media_thumbnail,
    article?.mediaThumbnail,
    article?.thumbnail,
    article?.thumbnail_url,
    article?.thumbnailUrl,
    article?.enclosure,
  ];

  for (const candidate of directCandidates) {
    directImageCandidates.push({
      source: "payload",
      url: candidate,
    });
  }

  const directImage = selectBestImageCandidate(directImageCandidates);
  if (directImage) return directImage;

  const htmlCandidates = [
    article?.description,
    article?.summary,
    article?.content,
    article?.content_encoded,
  ];

  for (const candidate of htmlCandidates) {
    const imageUrl = extractImageUrlFromHtml(candidate);
    if (imageUrl) return imageUrl;
  }

  return extractImageUrlFromPayload(article?.raw_payload || article?.rawPayload || article || {});
};
