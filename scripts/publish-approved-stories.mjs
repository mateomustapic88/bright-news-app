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
const maxRetries = Number(getEnv("PUBLISH_APPROVED_MAX_RETRIES") || 3);
const retryDelayMs = Number(getEnv("PUBLISH_APPROVED_RETRY_DELAY_MS") || 1500);
const existingStoriesChunkSize = Number(getEnv("PUBLISH_APPROVED_EXISTING_STORIES_CHUNK_SIZE") || 40);

const toSentence = value => (value || "").replace(/\s+/g, " ").trim();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const logPublishStage = (stage, details = {}) => {
  console.log(JSON.stringify({
    scope: "publish_approved",
    stage,
    ...details,
  }, null, 2));
};

const isRetryableFetchError = error => {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.name === "AbortError" ||
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("socket") ||
    message.includes("econnreset") ||
    message.includes("etimedout")
  );
};

const withRetries = async (label, runQuery) => {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await runQuery();
    } catch (error) {
      const shouldRetry = isRetryableFetchError(error) && attempt < maxRetries;

      if (!shouldRetry) {
        throw new Error(`${label}: ${error?.message || "Unknown fetch error"}`);
      }

      await sleep(retryDelayMs * (attempt + 1));
    }
  }
};

const chunk = (items, size) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const loadExistingStoriesBySourceUrl = async sourceUrls => {
  if (sourceUrls.length === 0) {
    return [];
  }

  const stories = [];
  const urlChunks = chunk(sourceUrls, existingStoriesChunkSize);

  for (const [index, urlChunk] of urlChunks.entries()) {
    const { data, error } = await withRetries(
      `Failed to load existing published stories chunk ${index + 1}/${urlChunks.length}`,
      () => supabase
        .from("stories")
        .select("id, source_url")
        .in("source_url", urlChunk),
    );

    if (error) throw new Error(error.message);
    stories.push(...(data || []));
  }

  return stories;
};

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
  const { data: publishedStories, error: storiesError } = await withRetries(
    "Failed to load published stories",
    () => supabase
      .from("stories")
      .select("id")
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false }),
  );

  if (storiesError) throw new Error(storiesError.message);

  const overflowStories = (publishedStories || []).slice(maxPublishedStories);

  if (overflowStories.length === 0) {
    return { prunedStories: 0, resetRawArticles: 0 };
  }

  const overflowIds = overflowStories.map(story => story.id);

  const { data: affectedRawArticles, error: rawSelectError } = await withRetries(
    "Failed to load raw articles for prune",
    () => supabase
      .from("raw_articles")
      .select("id")
      .in("published_story_id", overflowIds),
  );

  if (rawSelectError) throw new Error(rawSelectError.message);

  const { error: rawUpdateError } = await withRetries(
    "Failed to reset raw articles during prune",
    () => supabase
      .from("raw_articles")
      .update({
        review_status: "published",
        published_story_id: null,
        review_notes: "Moved out of live feed due to published story cap.",
      })
      .in("published_story_id", overflowIds),
  );

  if (rawUpdateError) throw new Error(rawUpdateError.message);

  const { error: deleteSavedError } = await withRetries(
    "Failed to delete saved stories during prune",
    () => supabase
      .from("saved_stories")
      .delete()
      .in("story_id", overflowIds),
  );

  if (deleteSavedError) throw new Error(deleteSavedError.message);

  const { error: deleteStoriesError } = await withRetries(
    "Failed to delete overflow stories",
    () => supabase
      .from("stories")
      .delete()
      .in("id", overflowIds),
  );

  if (deleteStoriesError) throw new Error(deleteStoriesError.message);

  return {
    prunedStories: overflowIds.length,
    resetRawArticles: (affectedRawArticles || []).length,
  };
};

export const run = async () => {
  let stage = "load_approved_raw_articles";

  try {
    logPublishStage(stage);
    const { data: approvedRows, error: approvedError } = await withRetries(
      "Failed to load approved raw articles",
      () => supabase
        .from("raw_articles")
        .select("*")
        .eq("review_status", "approved")
        .is("published_story_id", null)
        .order("published_at", { ascending: false })
        .limit(100),
    );

    if (approvedError) throw new Error(approvedError.message);
    if (!approvedRows || approvedRows.length === 0) {
      const emptyResult = { approved: 0, inserted: 0, published: 0 };
      logPublishStage("no_approved_rows", emptyResult);
      console.log(JSON.stringify(emptyResult, null, 2));
      return emptyResult;
    }

    const normalizedApprovedRows = approvedRows
      .map(row => ({ ...row, source_url: normalizeExternalUrl(row.source_url) }))
      .filter(row => row.source_url);
    logPublishStage("approved_rows_loaded", {
      approvedRows: approvedRows.length,
      normalizedApprovedRows: normalizedApprovedRows.length,
    });

    stage = "load_existing_stories";
    const sourceUrls = normalizedApprovedRows.map(row => row.source_url);
    const existingStories = await loadExistingStoriesBySourceUrl(sourceUrls);
    const existingBySourceUrl = new Map(existingStories.map(story => [story.source_url, story.id]));
    const rowsToInsert = normalizedApprovedRows.filter(row => !existingBySourceUrl.has(row.source_url));
    logPublishStage("existing_stories_loaded", {
      sourceUrls: sourceUrls.length,
      existingStories: existingBySourceUrl.size,
      rowsToInsert: rowsToInsert.length,
    });

    let insertedStories = [];

    if (rowsToInsert.length > 0) {
      stage = "insert_stories";
      const { data: insertedData, error: insertError } = await withRetries(
        "Failed to insert published stories",
        () => supabase
          .from("stories")
          .insert(rowsToInsert.map(buildStoryRow).filter(Boolean))
          .select("id, source_url"),
      );

      if (insertError) throw new Error(insertError.message);
      insertedStories = insertedData || [];
      logPublishStage(stage, { insertedStories: insertedStories.length });
    }

    const publishedBySourceUrl = new Map([
      ...existingBySourceUrl.entries(),
      ...insertedStories.map(story => [story.source_url, story.id]),
    ]);

    stage = "mark_raw_articles_published";
    let markedPublished = 0;

    for (const row of normalizedApprovedRows) {
      const publishedStoryId = publishedBySourceUrl.get(row.source_url);
      if (!publishedStoryId) continue;

      const { error: updateError } = await withRetries(
        `Failed to mark raw article ${row.id} as published`,
        () => supabase
          .from("raw_articles")
          .update({ review_status: "published", published_story_id: publishedStoryId })
          .eq("id", row.id),
      );

      if (updateError) throw new Error(updateError.message);
      markedPublished += 1;
    }

    logPublishStage(stage, { markedPublished });

    stage = "prune_published_stories";
    const pruneResult = await prunePublishedStories();
    logPublishStage(stage, pruneResult);

    const result = {
      approved: approvedRows.length,
      inserted: insertedStories.length,
      published: approvedRows.length,
      prunedStories: pruneResult.prunedStories,
      resetRawArticles: pruneResult.resetRawArticles,
      maxPublishedStories,
    };

    logPublishStage("completed", result);
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    logPublishStage("failed", {
      failedStage: stage,
      error: error?.message || "Unknown publish error",
    });
    throw error;
  }
};

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  run().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
