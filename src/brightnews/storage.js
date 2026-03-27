import { ONBOARDING_DISMISSED_KEY, SAVED_STORIES_KEY } from "./constants";

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
