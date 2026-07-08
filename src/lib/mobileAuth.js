import { Capacitor } from "@capacitor/core";
import { getConfiguredWebAuthRedirectUrl, MOBILE_AUTH_SCHEME } from "./appConfig";

export const MOBILE_AUTH_REDIRECT_URL = `${MOBILE_AUTH_SCHEME}://auth/callback`;

export const isNativeApp = () => Capacitor.isNativePlatform();

export const getAuthRedirectUrl = () => {
  if (isNativeApp()) return MOBILE_AUTH_REDIRECT_URL;
  if (typeof window === "undefined") return getConfiguredWebAuthRedirectUrl() || undefined;
  return getConfiguredWebAuthRedirectUrl() || window.location.origin;
};

export const isMobileAuthCallback = url => (
  typeof url === "string" && url.startsWith(`${MOBILE_AUTH_SCHEME}://`)
);

export const parseMobileAuthCallback = url => {
  if (!isMobileAuthCallback(url)) return null;

  const parsedUrl = new URL(url);
  const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ""));
  const queryParams = parsedUrl.searchParams;

  return {
    accessToken: hashParams.get("access_token") || queryParams.get("access_token"),
    refreshToken: hashParams.get("refresh_token") || queryParams.get("refresh_token"),
    code: queryParams.get("code") || hashParams.get("code"),
    errorCode: queryParams.get("error_code") || hashParams.get("error_code"),
    errorDescription: queryParams.get("error_description") || hashParams.get("error_description"),
  };
};
