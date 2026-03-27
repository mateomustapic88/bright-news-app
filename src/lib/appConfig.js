export const APP_NAME = "BrightNews";
export const APP_ID = "com.brightnews.app";
export const MOBILE_AUTH_SCHEME = APP_ID;
export const LEGAL_LINKS = {
  privacy: "/privacy-policy.html",
  support: "/support.html",
  deletion: "/account-deletion.html",
};

export const getConfiguredWebAuthRedirectUrl = () => {
  const configuredUrl = import.meta.env.VITE_WEB_AUTH_REDIRECT_URL?.trim();
  return configuredUrl || null;
};
