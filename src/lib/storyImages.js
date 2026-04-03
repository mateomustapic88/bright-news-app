export const STORY_IMAGE_URL_BLOCKLIST = [
  "goodnewsnetwork.org/wp-content/uploads/2017/11/2017-gnn-logo",
  "reasonstobecheerful.world/wp-content/uploads/2019/08/rtbc_logo.svg",
];

export const BRANDING_IMAGE_PATTERN = /(?:^|[/_.-])(logo|logos|favicon|icon|avatar|sprite)(?:[/_.-]|$)/i;

const normalizeImageValue = value => String(value || "").trim().toLowerCase();

export const isLikelyBrandingImageUrl = value => {
  const normalized = normalizeImageValue(value);
  if (!normalized) return false;
  return BRANDING_IMAGE_PATTERN.test(normalized);
};

export const isBlockedStoryImageUrl = value => {
  const normalized = normalizeImageValue(value);
  if (!normalized) return true;

  if (isLikelyBrandingImageUrl(normalized)) {
    return true;
  }

  return STORY_IMAGE_URL_BLOCKLIST.some(signature => normalized.includes(signature));
};
