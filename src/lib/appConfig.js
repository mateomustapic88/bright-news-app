export const APP_NAME = "BrightNews";
export const APP_ID = "com.brightnews.app";
export const MOBILE_AUTH_SCHEME = APP_ID;
export const SUPPORT_EMAIL = "brightnews.global@gmail.com";
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;
const withBasePath = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

export const LEGAL_LINKS = {
  privacy: withBasePath("privacy-policy.html"),
  support: withBasePath("support.html"),
  deletion: withBasePath("account-deletion.html"),
};

export const getConfiguredWebAuthRedirectUrl = () => {
  const configuredUrl = import.meta.env.VITE_WEB_AUTH_REDIRECT_URL?.trim();
  return configuredUrl || null;
};
