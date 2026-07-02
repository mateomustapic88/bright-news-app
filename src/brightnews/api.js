import { supabase } from "../lib/supabase";
import { sanitizeText } from "../lib/text";
import { normalizeExternalUrl } from "../lib/urls";
import { getLanguageForRegionCode, REGIONS } from "./constants";

const mapStoryRow = story => ({
  id: story.id,
  headline: sanitizeText(story.headline),
  summary: sanitizeText(story.summary),
  category: story.category,
  location: sanitizeText(story.location),
  emoji: story.emoji,
  impact: sanitizeText(story.impact),
  readTime: story.read_time || "1 min read",
  sourceUrl: normalizeExternalUrl(story.source_url),
  imageUrl: normalizeExternalUrl(story.image_url || ""),
  publishedAt: story.published_at || "",
  regionCode: story.region_code || "world",
  languageCode: getLanguageForRegionCode(story.region_code || "world"),
  savedCount: Number(story.saved_count || 0),
  isPinned: Boolean(story.is_pinned),
});

const applyStoryFilters = (query, regionCode, categoryId) => {
  let nextQuery = query;

  if (regionCode && regionCode !== "world") {
    nextQuery = nextQuery.eq("region_code", regionCode);
  }

  if (categoryId && categoryId !== "all") {
    nextQuery = nextQuery.eq("category", categoryId);
  }

  return nextQuery;
};

const applyPersonalizedStoryFilters = (query, preferences = {}) => {
  let nextQuery = query;
  const preferredRegions = Array.isArray(preferences?.preferredRegions)
    ? preferences.preferredRegions.filter(Boolean)
    : [];
  const preferredCategories = Array.isArray(preferences?.preferredCategories)
    ? preferences.preferredCategories.filter(Boolean)
    : [];

  if (preferredRegions.length > 0) {
    nextQuery = nextQuery.in("region_code", preferredRegions);
  }

  if (preferredCategories.length > 0) {
    nextQuery = nextQuery.in("category", preferredCategories);
  }

  return nextQuery;
};

const applyStoryOrdering = (query, storyFilter = "newest") => {
  if (storyFilter === "top") {
    return query
      .order("saved_count", { ascending: false })
      .order("published_at", { ascending: false });
  }

  if (storyFilter === "featured") {
    return query
      .order("is_pinned", { ascending: false })
      .order("saved_count", { ascending: false })
      .order("published_at", { ascending: false });
  }

  return query.order("published_at", { ascending: false });
};

export const loadStories = async (regionCode, categoryId, options = {}) => {
  if (!supabase) {
    throw new Error("Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const {
    offset = 0,
    limit,
    storyFilter = "newest",
  } = options;

  let query = supabase
    .from("stories")
    .select("*");

  query = applyStoryFilters(query, regionCode, categoryId);
  query = applyStoryOrdering(query, storyFilter);

  if (typeof limit === "number" && limit > 0) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return (data || []).map(mapStoryRow);
};

export const loadStoriesPage = async (regionCode, categoryId, options = {}) => {
  const {
    offset = 0,
    limit = 10,
  } = options;

  const items = await loadStories(regionCode, categoryId, { offset, limit, storyFilter: options.storyFilter });

  return {
    items,
    hasMore: items.length === limit,
    nextOffset: offset + items.length,
  };
};

export const loadSeoStories = async ({
  regionCode = "world",
  categoryId = "all",
  storyFilter = "newest",
  limit = 12,
} = {}) => {
  if (!supabase) {
    throw new Error("Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  let query = supabase
    .from("stories")
    .select("id, headline, summary, category, location, emoji, impact, read_time, source_url, image_url, published_at, region_code, saved_count, is_pinned")
    .limit(limit);

  query = applyStoryFilters(query, regionCode, categoryId);
  query = applyStoryOrdering(query, storyFilter);

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return (data || []).map(mapStoryRow);
};

export const loadPersonalizedStories = async (preferences, options = {}) => {
  if (!supabase) {
    throw new Error("Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const {
    offset = 0,
    limit,
    storyFilter = "newest",
  } = options;

  let query = supabase
    .from("stories")
    .select("*");

  query = applyPersonalizedStoryFilters(query, preferences);
  query = applyStoryOrdering(query, storyFilter);

  if (typeof limit === "number" && limit > 0) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return (data || []).map(mapStoryRow);
};

export const loadPersonalizedStoriesPage = async (preferences, options = {}) => {
  const {
    offset = 0,
    limit = 10,
  } = options;

  const items = await loadPersonalizedStories(preferences, { offset, limit, storyFilter: options.storyFilter });

  return {
    items,
    hasMore: items.length === limit,
    nextOffset: offset + items.length,
  };
};

export const loadAvailableRegionCodes = async () => {
  const configuredCodes = REGIONS.map(region => region.code);

  if (!supabase) return configuredCodes;

  const { data, error } = await supabase
    .from("stories")
    .select("region_code");

  if (error) throw new Error(error.message);

  const codes = new Set(
    [...configuredCodes, ...(data || [])
      .map(item => item.region_code)
      .filter(Boolean)],
  );

  return Array.from(codes);
};

export const loadSavedStoryIds = async userId => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("saved_stories")
    .select("story_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map(item => item.story_id);
};

export const loadStoriesByIds = async storyIds => {
  if (!supabase || storyIds.length === 0) return [];

  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .in("id", storyIds);

  if (error) throw new Error(error.message);

  const storyMap = new Map((data || []).map(story => [story.id, mapStoryRow(story)]));
  return storyIds.map(id => storyMap.get(id)).filter(Boolean);
};

export const loadProfile = async userId => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data;
};

export const loadSourceReadCountToday = async userId => {
  if (!supabase || !userId) return 0;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("source_link_reads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("opened_at", startOfDay.toISOString());

  if (error) throw new Error(error.message);

  return Number(count || 0);
};

export const createSourceRead = async (userId, storyId) => {
  if (!supabase || !userId || !storyId) return;

  const { error } = await supabase
    .from("source_link_reads")
    .insert({ user_id: userId, story_id: storyId });

  if (error) throw new Error(error.message);
};

const mapUserPreferences = row => ({
  preferredRegions: Array.isArray(row?.preferred_regions) ? row.preferred_regions : [],
  preferredCategories: Array.isArray(row?.preferred_categories) ? row.preferred_categories : [],
  strictPositiveFilter: Boolean(row?.strict_positive_filter),
});

export const loadUserPreferences = async userId => {
  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from("user_preferences")
    .select("preferred_regions, preferred_categories, strict_positive_filter")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data ? mapUserPreferences(data) : null;
};

export const upsertUserPreferences = async (userId, preferences) => {
  if (!supabase || !userId) return null;

  const payload = {
    user_id: userId,
    preferred_regions: Array.isArray(preferences?.preferredRegions) ? preferences.preferredRegions : [],
    preferred_categories: Array.isArray(preferences?.preferredCategories) ? preferences.preferredCategories : [],
    strict_positive_filter: Boolean(preferences?.strictPositiveFilter),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(payload, { onConflict: "user_id" })
    .select("preferred_regions, preferred_categories, strict_positive_filter")
    .single();

  if (error) throw new Error(error.message);

  return mapUserPreferences(data);
};

export const loadRawArticles = async reviewStatus => {
  if (!supabase) return [];

  let query = supabase
    .from("raw_articles")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(50);

  if (reviewStatus && reviewStatus !== "all") {
    query = query.eq("review_status", reviewStatus);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return (data || []).map(article => ({
    ...article,
    title: sanitizeText(article.title),
    description: sanitizeText(article.description),
    content: sanitizeText(article.content),
  }));
};

export const updateRawArticleReviewStatus = async (
  rawArticleId,
  reviewStatus,
  rejectedReason = "",
) => {
  if (!supabase) return;

  const payload = {
    review_status: reviewStatus,
    rejected_reason: reviewStatus === "rejected" ? rejectedReason : "",
  };

  const { error } = await supabase
    .from("raw_articles")
    .update(payload)
    .eq("id", rawArticleId);

  if (error) throw new Error(error.message);
};

export const upsertProfile = async user => {
  if (!supabase || !user) return null;

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.user_name ||
    "";

  const payload = {
    id: user.id,
    email: user.email || "",
    display_name: displayName,
    onboarding_completed: false,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return data;
};

export const createSavedStory = async (userId, storyId) => {
  if (!supabase) return;

  const { error } = await supabase
    .from("saved_stories")
    .insert({ user_id: userId, story_id: storyId });

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }
};

export const deleteSavedStory = async (userId, storyId) => {
  if (!supabase) return;

  const { error } = await supabase
    .from("saved_stories")
    .delete()
    .eq("user_id", userId)
    .eq("story_id", storyId);

  if (error) throw new Error(error.message);
};

export const createStoryReport = async (userId, storyId, reason) => {
  if (!supabase) return;

  const { error } = await supabase
    .from("story_reports")
    .insert({ user_id: userId, story_id: storyId, reason });

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }
};
