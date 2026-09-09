const PREFIX = "brightnews.readingHistory.v1.";
const MAX_HISTORY = 3000;

export const getReadingStorage = () => {
  try { return window.localStorage; } catch { return null; }
};

export const readHideReadPreference = (storage, userId) => {
  try { return storage.getItem(`${PREFIX}${userId || "guest"}.hideRead`) === "true"; } catch { return false; }
};

export const writeHideReadPreference = (storage, userId, value) => {
  try { storage.setItem(`${PREFIX}${userId || "guest"}.hideRead`, String(Boolean(value))); } catch { /* Storage may be disabled. */ }
};

export const readReadingHistory = (storage, userId) => {
  try {
    const items = JSON.parse(storage.getItem(PREFIX + (userId || "guest")) || "[]");
    return Array.isArray(items) ? items.filter(id => typeof id === "string").slice(-MAX_HISTORY) : [];
  } catch {
    return [];
  }
};

export const writeReadingHistory = (storage, userId, items) => {
  try {
    storage.setItem(PREFIX + (userId || "guest"), JSON.stringify([...new Set(items)].slice(-MAX_HISTORY)));
  } catch {
    // Reading still works when browser storage is unavailable.
  }
};

export const filterSavedLibrary = (stories, { category = "all", status = "all", search = "", readIds = [] } = {}) => {
  const read = new Set(readIds);
  const term = search.trim().toLocaleLowerCase();
  return stories.filter(story => (
    (category === "all" || story.category === category)
    && (status === "all" || (status === "read" ? read.has(story.id) : !read.has(story.id)))
    && (!term || `${story.headline} ${story.summary || ""} ${story.location || ""}`.toLocaleLowerCase().includes(term))
  ));
};
