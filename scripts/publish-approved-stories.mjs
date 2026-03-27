import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import { normalizeExternalUrl } from "../src/lib/urls.js";

const getEnv = name => process.env[name];
const getRequiredEnv = name => {
  const value = getEnv(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const supabaseUrl = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl) {
  throw new Error("Missing required environment variable: SUPABASE_URL or VITE_SUPABASE_URL");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const maxPublishedStories = Number(getEnv("MAX_PUBLISHED_STORIES") || 150);

const toSentence = value => (value || "").replace(/\s+/g, " ").trim();

const buildStoryRow = rawArticle => {
  const sourceUrl = normalizeExternalUrl(rawArticle.source_url);

  if (!sourceUrl) return null;

  return {
    headline: toSentence(rawArticle.title).slice(0, 120),
    summary: toSentence(rawArticle.description || rawArticle.content).slice(0, 240),
    category: rawArticle.category,
    location: rawArticle.source_name || (rawArticle.region_code === "world" ? "Worldwide" : rawArticle.region_code.toUpperCase()),
    emoji: rawArticle.emoji || "✨",
    impact: "Positive progress worth tracking and sharing.",
    read_time: "1 min read",
    region_code: rawArticle.region_code,
    country_code: rawArticle.country_code,
    is_pinned: false,
    published_at: rawArticle.published_at || new Date().toISOString(),
    source_url: sourceUrl,
  };
};

const prunePublishedStories = async () => {
  const { data: publishedStories, error: storiesError } = await supabase
    .from("stories")
    .select("id")
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false });

  if (storiesError) throw new Error(storiesError.message);

  const overflowStories = (publishedStories || []).slice(maxPublishedStories);

  if (overflowStories.length === 0) {
    return { prunedStories: 0, resetRawArticles: 0 };
  }

  const overflowIds = overflowStories.map(story => story.id);

  const { data: affectedRawArticles, error: rawSelectError } = await supabase
    .from("raw_articles")
    .select("id")
    .in("published_story_id", overflowIds);

  if (rawSelectError) throw new Error(rawSelectError.message);

  const { error: rawUpdateError } = await supabase
    .from("raw_articles")
    .update({
      review_status: "approved",
      published_story_id: null,
      review_notes: "Moved out of live feed due to published story cap.",
    })
    .in("published_story_id", overflowIds);

  if (rawUpdateError) throw new Error(rawUpdateError.message);

  const { error: deleteSavedError } = await supabase
    .from("saved_stories")
    .delete()
    .in("story_id", overflowIds);

  if (deleteSavedError) throw new Error(deleteSavedError.message);

  const { error: deleteStoriesError } = await supabase
    .from("stories")
    .delete()
    .in("id", overflowIds);

  if (deleteStoriesError) throw new Error(deleteStoriesError.message);

  return {
    prunedStories: overflowIds.length,
    resetRawArticles: (affectedRawArticles || []).length,
  };
};

export const run = async () => {
  const { data: approvedRows, error: approvedError } = await supabase
    .from("raw_articles")
    .select("*")
    .eq("review_status", "approved")
    .is("published_story_id", null)
    .order("published_at", { ascending: false })
    .limit(100);

  if (approvedError) throw new Error(approvedError.message);
  if (!approvedRows || approvedRows.length === 0) {
    const emptyResult = { approved: 0, inserted: 0, published: 0 };
    console.log(JSON.stringify(emptyResult, null, 2));
    return emptyResult;
  }

  const normalizedApprovedRows = approvedRows
    .map(row => ({ ...row, source_url: normalizeExternalUrl(row.source_url) }))
    .filter(row => row.source_url);

  const sourceUrls = normalizedApprovedRows.map(row => row.source_url);
  const { data: existingStories, error: existingError } = await supabase
    .from("stories")
    .select("id, source_url")
    .in("source_url", sourceUrls);

  if (existingError) throw new Error(existingError.message);

  const existingBySourceUrl = new Map((existingStories || []).map(story => [story.source_url, story.id]));
  const rowsToInsert = normalizedApprovedRows.filter(row => !existingBySourceUrl.has(row.source_url));

  let insertedStories = [];

  if (rowsToInsert.length > 0) {
    const { data: insertedData, error: insertError } = await supabase
      .from("stories")
      .insert(rowsToInsert.map(buildStoryRow).filter(Boolean))
      .select("id, source_url");

    if (insertError) throw new Error(insertError.message);
    insertedStories = insertedData || [];
  }

  const publishedBySourceUrl = new Map([
    ...existingBySourceUrl.entries(),
    ...insertedStories.map(story => [story.source_url, story.id]),
  ]);

  for (const row of normalizedApprovedRows) {
    const publishedStoryId = publishedBySourceUrl.get(row.source_url);
    if (!publishedStoryId) continue;

    const { error: updateError } = await supabase
      .from("raw_articles")
      .update({ review_status: "published", published_story_id: publishedStoryId })
      .eq("id", row.id);

    if (updateError) throw new Error(updateError.message);
  }

  const pruneResult = await prunePublishedStories();

  const result = {
    approved: approvedRows.length,
    inserted: insertedStories.length,
    published: approvedRows.length,
    prunedStories: pruneResult.prunedStories,
    resetRawArticles: pruneResult.resetRawArticles,
    maxPublishedStories,
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
};

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  run().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
