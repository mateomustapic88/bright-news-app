// Use the last complete Monday-to-Monday UTC week for a consistent edition.
export const getBriefingWeek = (now = new Date()) => {
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() - ((end.getUTCDay() + 6) % 7));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  return { start: start.toISOString(), end: end.toISOString() };
};

export const selectBriefingStories = (stories, week, preferences = {}, limit = 5) => {
  const start = Date.parse(week.start);
  const end = Date.parse(week.end);
  const seen = new Set();
  const candidates = stories.filter(story => {
    const date = Date.parse(story.publishedAt);
    const identity = story.sourceUrl || story.id;
    if (!story.id || !story.summary || !Number.isFinite(date) || date < start || date >= end || seen.has(identity)) return false;
    if (preferences.preferredRegions?.length && !preferences.preferredRegions.includes(story.regionCode)) return false;
    if (preferences.preferredCategories?.length && !preferences.preferredCategories.includes(story.category)) return false;
    seen.add(identity);
    return true;
  }).sort((a, b) => Number(b.isPinned) - Number(a.isPinned)
    || Number(b.savedCount || 0) - Number(a.savedCount || 0)
    || Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
    || String(a.id).localeCompare(String(b.id)));

  const selected = [];
  const categories = new Set();
  const sources = new Set();
  // Prefer topic and publisher variety before filling remaining places.
  for (const diverse of [true, false]) {
    for (const story of candidates) {
      if (selected.length >= limit) return selected;
      if (selected.includes(story)) continue;
      if (diverse && (categories.has(story.category) || sources.has(story.location))) continue;
      selected.push(story);
      categories.add(story.category);
      sources.add(story.location);
    }
  }
  return selected;
};
