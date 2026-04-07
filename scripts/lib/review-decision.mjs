import { normalizeExternalUrl } from "../../src/lib/urls.js";
import { isBlockedStoryImageUrl, isLikelyBrandingImageUrl } from "../../src/lib/storyImages.js";
import { countKeywordHits, matchesKeyword, normalizeHaystack, toSentence } from "./html-text.mjs";

const clampScore = value => Math.max(0, Math.min(1, value));
const IMAGE_VECTOR_PATTERN = /\.svg(?:\?\S*)?$/i;

export const getSourceQualityScore = ({
  vendor,
  sourceName = "",
  sourceUrl = "",
  title = "",
  description = "",
  content = "",
  imageUrl = "",
  publishedAt = null,
  sourceQualityProfiles = [],
}) => {
  const normalizedVendor = String(vendor || "").toLowerCase();
  const normalizedSourceName = String(sourceName || "").toLowerCase();
  const normalizedSourceUrl = normalizeExternalUrl(sourceUrl || "").toLowerCase();
  const baseProfile = sourceQualityProfiles.find(profile =>
    normalizedVendor.includes(profile.match) ||
    normalizedSourceName.includes(profile.match) ||
    normalizedSourceUrl.includes(profile.match)
  );

  let score = baseProfile?.score ?? 0.5;

  if (title && title.length >= 30) score += 0.08;
  if (description && description.length >= 90) score += 0.08;
  if (content && content.length >= 160) score += 0.06;
  if (imageUrl && !isBlockedStoryImageUrl(imageUrl)) score += 0.1;
  if (publishedAt) score += 0.05;
  if (normalizedSourceUrl.startsWith("https://")) score += 0.02;
  if (normalizedSourceUrl.includes("news.google.com")) score -= 0.12;
  if (!description && !content) score -= 0.12;
  if (IMAGE_VECTOR_PATTERN.test(imageUrl || "")) score -= 0.08;
  if (isLikelyBrandingImageUrl(imageUrl || "")) score -= 0.15;

  return clampScore(score);
};

export const inferReviewDecision = ({
  vendor,
  sourceName = "",
  sourceUrl = "",
  imageUrl = "",
  publishedAt = null,
  title,
  description,
  content = "",
  tags = [],
  config,
}) => {
  const {
    NON_NEWS_TITLE_PATTERNS,
    NEGATIVE_KEYWORDS,
    BLOCKED_TOPIC_TAGS,
    BLOCKED_SOURCE_HOSTS,
    POSITIVE_KEYWORDS,
    COMMUNITY_POSITIVE_HINTS,
    LOCAL_POSITIVE_LEAN_VENDORS,
    INFORMATIVE_POSITIVE_CATEGORY_TAGS,
    LOCAL_INFORMATIVE_KEYWORDS,
    TRUSTED_AUTO_APPROVE_VENDORS,
    SOURCE_QUALITY_PROFILES,
    hasOpenAiReviewer,
    thresholds,
  } = config;

  const haystack = normalizeHaystack([title, description, content, tags.join(" ")]);
  const normalizedTags = tags.map(tag => toSentence(tag).toLowerCase());
  const normalizedTitle = toSentence(title).toLowerCase();
  const normalizedSourceUrl = normalizeExternalUrl(sourceUrl || tags.find(tag => tag.startsWith?.("http")) || "");
  const sourceQualityScore = getSourceQualityScore({
    vendor,
    sourceName,
    sourceUrl: normalizedSourceUrl,
    title,
    description,
    content,
    imageUrl,
    publishedAt,
    sourceQualityProfiles: SOURCE_QUALITY_PROFILES,
  });

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
  const hasCommunityPositiveHint = COMMUNITY_POSITIVE_HINTS.some(keyword => matchesKeyword(haystack, keyword));
  const isLocalPositiveLeanVendor = LOCAL_POSITIVE_LEAN_VENDORS.has(vendor);
  const hasInformativePositiveCategory = normalizedTags.some(tag => INFORMATIVE_POSITIVE_CATEGORY_TAGS.has(tag));
  const informativeScore = countKeywordHits(haystack, LOCAL_INFORMATIVE_KEYWORDS);
  const adjustedPositiveScore =
    positiveScore +
    (isLocalPositiveLeanVendor && hasCommunityPositiveHint ? thresholds.localPositiveScoreBoost : 0) +
    (isLocalPositiveLeanVendor && hasInformativePositiveCategory && informativeScore > 0
      ? thresholds.localInformativeScoreBoost
      : 0);
  const candidateScore = Math.min(1, adjustedPositiveScore / 3);
  const isTrustedVendor = TRUSTED_AUTO_APPROVE_VENDORS.has(vendor);
  const minPositiveScore = isLocalPositiveLeanVendor ? thresholds.localPositiveMinScore : thresholds.minPositiveScore;
  const autoApproveScore = isLocalPositiveLeanVendor
    ? thresholds.localPositiveAutoApproveScore
    : thresholds.heuristicAutoApproveScore;
  const sourceAdjustedScore = clampScore((candidateScore * 0.78) + (sourceQualityScore * 0.22));
  const effectiveMinPositiveScore = Math.max(
    0.32,
    minPositiveScore - (sourceQualityScore >= 0.8 ? 0.06 : 0) + (sourceQualityScore < thresholds.minSourceQualityScore ? 0.08 : 0),
  );
  const effectiveAutoApproveScore = Math.min(
    0.92,
    autoApproveScore - (sourceQualityScore >= 0.82 ? 0.05 : 0),
  );
  const hasStrongLocalPositiveSignal = hasCommunityPositiveHint || informativeScore > 0;
  const canAutoApproveStrongLocal =
    isLocalPositiveLeanVendor &&
    hasStrongLocalPositiveSignal &&
    sourceQualityScore >= thresholds.autoApproveMinSourceQualityScore &&
    sourceAdjustedScore >= effectiveAutoApproveScore;

  if (isTrustedVendor && !hasOpenAiReviewer) {
    return {
      reviewStatus: "approved",
      rejectedReason: "",
      reviewNotes: `Auto-approved from trusted curated source without OpenAI review (positive ${candidateScore.toFixed(2)}, source ${sourceQualityScore.toFixed(2)}).`,
    };
  }

  if (!hasOpenAiReviewer &&
      sourceQualityScore >= thresholds.autoApproveMinSourceQualityScore &&
      sourceAdjustedScore >= effectiveAutoApproveScore) {
    return {
      reviewStatus: "approved",
      rejectedReason: "",
      reviewNotes: `Auto-approved by heuristic score without OpenAI review (positive ${candidateScore.toFixed(2)}, source ${sourceQualityScore.toFixed(2)}, blended ${sourceAdjustedScore.toFixed(2)}).`,
    };
  }

  if (canAutoApproveStrongLocal) {
    return {
      reviewStatus: "approved",
      rejectedReason: "",
      reviewNotes: `Auto-approved from strong local positive signal (positive ${candidateScore.toFixed(2)}, source ${sourceQualityScore.toFixed(2)}, blended ${sourceAdjustedScore.toFixed(2)}).`,
    };
  }

  if (!isTrustedVendor && (candidateScore < effectiveMinPositiveScore || sourceQualityScore < thresholds.minSourceQualityScore)) {
    return {
      reviewStatus: "rejected",
      rejectedReason: sourceQualityScore < thresholds.minSourceQualityScore ? "auto_low_source_quality" : "auto_low_positive_score",
      reviewNotes: `Rejected by heuristic score (positive ${candidateScore.toFixed(2)}, source ${sourceQualityScore.toFixed(2)}).`,
    };
  }

  return {
    reviewStatus: "pending",
    rejectedReason: "",
    reviewNotes: `Awaiting OpenAI review. Positive ${candidateScore.toFixed(2)}, source ${sourceQualityScore.toFixed(2)}, blended ${sourceAdjustedScore.toFixed(2)}.`,
  };
};
