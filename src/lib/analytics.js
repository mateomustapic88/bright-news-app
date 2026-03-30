import { Capacitor } from "@capacitor/core";
import { FirebaseAnalytics } from "@capacitor-firebase/analytics";

const isNativeAnalyticsAvailable = () => Capacitor.isNativePlatform();

const sanitizeParams = params =>
  Object.fromEntries(
    Object.entries(params || {}).filter(([, value]) => (
      value !== undefined &&
      value !== null &&
      (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    )),
  );

const withAnalytics = async callback => {
  if (!isNativeAnalyticsAvailable()) return;

  try {
    await callback();
  } catch {
    // Avoid surfacing analytics failures to end users.
  }
};

export const enableAnalytics = async () => {
  await withAnalytics(() => FirebaseAnalytics.setEnabled({ enabled: true }));
};

export const trackEvent = async (name, params = {}) => {
  await withAnalytics(() => FirebaseAnalytics.logEvent({
    name,
    params: sanitizeParams(params),
  }));
};

export const trackScreenView = async screenName => {
  await withAnalytics(() => FirebaseAnalytics.setCurrentScreen({
    screenName,
    screenClassOverride: "BrightNewsApp",
  }));
};

export const setAnalyticsUserId = async userId => {
  await withAnalytics(() => FirebaseAnalytics.setUserId({ userId: userId || null }));
};

export const setAnalyticsUserProperty = async (key, value) => {
  await withAnalytics(() => FirebaseAnalytics.setUserProperty({
    key,
    value: value == null ? null : String(value),
  }));
};
