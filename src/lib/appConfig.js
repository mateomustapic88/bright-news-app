export const APP_NAME = "BrightNews";
export const APP_ID = "com.mateomustapic.brightnews";
export const MOBILE_AUTH_SCHEME = APP_ID;
export const SUPPORT_EMAIL = "brightnews.global@gmail.com";
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;
export const WEB_APP_URL = "https://brightnews.app";
const LEGACY_WEB_HOSTS = new Set(["brightnews-three.vercel.app"]);
const withBasePath = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

export const LEGAL_LINKS = {
  privacy: withBasePath("privacy-policy.html"),
  support: withBasePath("support.html"),
  deletion: withBasePath("account-deletion.html"),
};

export const buildFeedbackMailto = () => {
  const subject = `${APP_NAME} feedback`;
  const body = [
    "Hi,",
    "",
    "Here is my feedback for BrightNews:",
    "",
    "Device:",
    "OS version:",
    "What happened:",
    "What I expected:",
    "",
    "Additional notes:",
    "",
    typeof navigator !== "undefined" ? `User agent: ${navigator.userAgent}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export const getConfiguredWebAuthRedirectUrl = () => {
  const configuredUrl = import.meta.env.VITE_WEB_AUTH_REDIRECT_URL?.trim();
  if (!configuredUrl) return null;

  try {
    const url = new URL(configuredUrl);
    if (LEGACY_WEB_HOSTS.has(url.hostname)) return WEB_APP_URL;
  } catch {
    return null;
  }

  return configuredUrl;
};
