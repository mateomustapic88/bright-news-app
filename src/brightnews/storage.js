import {
  APP_LANGUAGE_KEY,
  SOURCE_READS_KEY,
  ONBOARDING_DISMISSED_KEY,
  PREFERRED_REGION_KEY,
  SAVED_STORIES_KEY,
  STORY_LANGUAGE_FILTER_KEY,
  SUPPORT_MODAL_DISMISSED_KEY,
  SUPPORT_MODAL_SUPPORTED_KEY,
  THEME_PREFERENCE_KEY,
  THEME_PREFERENCES,
  USER_PREFERENCES_KEY,
} from "./constants";

const getTodayKey = () => new Date().toISOString().slice(0, 10);

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

export const readSupportModalDismissedToday = () => {
  if (typeof window === "undefined") return true;

  try {
    return window.localStorage.getItem(SUPPORT_MODAL_DISMISSED_KEY) === getTodayKey();
  } catch {
    return true;
  }
};

export const writeSupportModalDismissedToday = () => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(SUPPORT_MODAL_DISMISSED_KEY, getTodayKey());
  } catch {
    // Keep support prompt non-blocking if storage is unavailable.
  }
};

export const readSupportModalSupported = () => {
  if (typeof window === "undefined") return true;

  try {
    return window.localStorage.getItem(SUPPORT_MODAL_SUPPORTED_KEY) === "true";
  } catch {
    return true;
  }
};

export const writeSupportModalSupported = () => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(SUPPORT_MODAL_SUPPORTED_KEY, "true");
  } catch {
    // Keep support prompt non-blocking if storage is unavailable.
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

export const readThemePreference = () => {
  if (typeof window === "undefined") return "light";

  try {
    const value = window.localStorage.getItem(THEME_PREFERENCE_KEY);
    return THEME_PREFERENCES.includes(value) ? value : "light";
  } catch {
    return "light";
  }
};

export const writeThemePreference = value => {
  if (typeof window === "undefined") return;

  try {
    if (!THEME_PREFERENCES.includes(value)) {
      window.localStorage.removeItem(THEME_PREFERENCE_KEY);
      return;
    }

    window.localStorage.setItem(THEME_PREFERENCE_KEY, value);
  } catch {
    // Keep theme preference non-blocking if storage is unavailable.
  }
};

export const readLocalSourceReadCount = () => {
  if (typeof window === "undefined") return 0;

  try {
    const stored = window.localStorage.getItem(SOURCE_READS_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    const today = getTodayKey();
    return Number(parsed?.[today] || 0);
  } catch {
    return 0;
  }
};

export const incrementLocalSourceReadCount = () => {
  if (typeof window === "undefined") return 0;

  try {
    const stored = window.localStorage.getItem(SOURCE_READS_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    const today = getTodayKey();
    const nextCount = Number(parsed?.[today] || 0) + 1;
    window.localStorage.setItem(SOURCE_READS_KEY, JSON.stringify({ [today]: nextCount }));
    return nextCount;
  } catch {
    return 0;
  }
};

export const readUserPreferences = () => {
  if (typeof window === "undefined") {
    return {
      preferredRegions: [],
      preferredCategories: [],
      strictPositiveFilter: false,
      hideSavedStories: false,
    };
  }

  try {
    const stored = window.localStorage.getItem(USER_PREFERENCES_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    return {
      preferredRegions: Array.isArray(parsed.preferredRegions) ? parsed.preferredRegions : [],
      preferredCategories: Array.isArray(parsed.preferredCategories) ? parsed.preferredCategories : [],
      strictPositiveFilter: Boolean(parsed.strictPositiveFilter),
      hideSavedStories: Boolean(parsed.hideSavedStories),
    };
  } catch {
    return {
      preferredRegions: [],
      preferredCategories: [],
      strictPositiveFilter: false,
      hideSavedStories: false,
    };
  }
};

export const writeUserPreferences = preferences => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Keep preference preview non-blocking if storage is unavailable.
  }
};
