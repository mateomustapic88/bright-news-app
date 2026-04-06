import {
  APP_LANGUAGE_KEY,
  ONBOARDING_DISMISSED_KEY,
  PREFERRED_REGION_KEY,
  SAVED_STORIES_KEY,
  STORY_LANGUAGE_FILTER_KEY,
} from "./constants";

export const readSavedStories = () => {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(SAVED_STORIES_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const readOnboardingDismissed = () => {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
};

export const writeOnboardingDismissed = value => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(ONBOARDING_DISMISSED_KEY, String(Boolean(value)));
  } catch {
    // Keep onboarding non-blocking if storage is unavailable.
  }
};

export const readPreferredRegion = () => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(PREFERRED_REGION_KEY);
  } catch {
    return null;
  }
};

export const writePreferredRegion = regionCode => {
  if (typeof window === "undefined") return;

  try {
    if (!regionCode) {
      window.localStorage.removeItem(PREFERRED_REGION_KEY);
      return;
    }

    window.localStorage.setItem(PREFERRED_REGION_KEY, regionCode);
  } catch {
    // Keep region preference non-blocking if storage is unavailable.
  }
};

export const readAppLanguage = () => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(APP_LANGUAGE_KEY);
  } catch {
    return null;
  }
};

export const writeAppLanguage = languageCode => {
  if (typeof window === "undefined") return;

  try {
    if (!languageCode) {
      window.localStorage.removeItem(APP_LANGUAGE_KEY);
      return;
    }

    window.localStorage.setItem(APP_LANGUAGE_KEY, languageCode);
  } catch {
    // Keep language preference non-blocking if storage is unavailable.
  }
};

export const readStoryLanguageFilter = () => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(STORY_LANGUAGE_FILTER_KEY);
  } catch {
    return null;
  }
};

export const writeStoryLanguageFilter = languageCode => {
  if (typeof window === "undefined") return;

  try {
    if (!languageCode) {
      window.localStorage.removeItem(STORY_LANGUAGE_FILTER_KEY);
      return;
    }

    window.localStorage.setItem(STORY_LANGUAGE_FILTER_KEY, languageCode);
  } catch {
    // Keep story language filter non-blocking if storage is unavailable.
  }
};
