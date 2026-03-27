import { supabase } from "../lib/supabase";
import { normalizeExternalUrl } from "../lib/urls";

const mapStoryRow = story => ({
  id: story.id,
  headline: story.headline,
  summary: story.summary,
  category: story.category,
  location: story.location,
  emoji: story.emoji,
  impact: story.impact,
  readTime: story.read_time || "1 min read",
  sourceUrl: normalizeExternalUrl(story.source_url),
});

export const loadStories = async (regionCode, categoryId) => {
  if (!supabase) {
    throw new Error("Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  let query = supabase
    .from("stories")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false });

  if (regionCode && regionCode !== "world") {
    query = query.eq("region_code", regionCode);
  }

  if (categoryId && categoryId !== "all") {
    query = query.eq("category", categoryId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return (data || []).map(mapStoryRow);
};

export const loadAvailableRegionCodes = async () => {
  if (!supabase) return ["world"];

  const { data, error } = await supabase
    .from("stories")
    .select("region_code");

  if (error) throw new Error(error.message);

  const codes = new Set(
    (data || [])
      .map(item => item.region_code)
      .filter(Boolean),
  );

  if (codes.size === 0) {
    return ["world"];
  }

  if (!codes.has("world")) {
    codes.add("world");
  }

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

  return data || [];
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
    plan: "free",
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
