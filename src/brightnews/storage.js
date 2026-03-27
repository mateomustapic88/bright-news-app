import { SAVED_STORIES_KEY } from "./constants";

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
