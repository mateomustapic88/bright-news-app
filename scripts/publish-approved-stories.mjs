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
const maxRetries = Number(getEnv("PUBLISH_APPROVED_MAX_RETRIES") || 3);
const retryDelayMs = Number(getEnv("PUBLISH_APPROVED_RETRY_DELAY_MS") || 1500);

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

const loadLiveStories = async () => {
  const { data, error } = await withRetries(
    "Failed to load live stories",
    () => supabase
      .from("stories")
      .select("id, source_url, region_code, country_code, is_pinned, published_at")
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false }),
  );

  if (error) throw new Error(error.message);
  return data || [];
};

const loadRepublishCandidates = async () => {
  const { data, error } = await withRetries(
    "Failed to load republish candidates",
    () => supabase
      .from("raw_articles")
      .select("*")
      .eq("review_status", "published")
      .is("published_story_id", null)
      .ilike("review_notes", "%Moved out of live feed due to published story cap.%")
      .order("published_at", { ascending: false })
      .limit(500),
  );

  if (error) throw new Error(error.message);
  return data || [];
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

    const normalizedApprovedRows = (approvedRows || [])
      .map(row => ({ ...row, source_url: normalizeExternalUrl(row.source_url) }))
      .filter(row => row.source_url);
    logPublishStage("approved_rows_loaded", {
      approvedRows: approvedRows?.length || 0,
      normalizedApprovedRows: normalizedApprovedRows.length,
    });

    stage = "load_existing_stories";
    const liveStories = await loadLiveStories();
    const existingStories = liveStories;
    const existingBySourceUrl = new Map(existingStories.map(story => [story.source_url, story.id]));
    const rowsToInsert = normalizedApprovedRows.filter(row => !existingBySourceUrl.has(row.source_url));
    const republishCandidates = await loadRepublishCandidates();
    const selectedRepublishRows = [];
    const selectedSourceUrls = new Set(rowsToInsert.map(row => row.source_url));

    for (const row of republishCandidates) {
      const sourceUrl = normalizeExternalUrl(row.source_url);
      if (!sourceUrl || existingBySourceUrl.has(sourceUrl) || selectedSourceUrls.has(sourceUrl)) {
        continue;
      }

      selectedSourceUrls.add(sourceUrl);
      selectedRepublishRows.push({ ...row, source_url: sourceUrl });
    }

    const candidateRowsToInsert = [...rowsToInsert, ...selectedRepublishRows];
    logPublishStage("existing_stories_loaded", {
      liveStories: liveStories.length,
      existingStories: existingBySourceUrl.size,
      rowsToInsert: rowsToInsert.length,
      republishRowsToInsert: selectedRepublishRows.length,
      candidateRowsToInsert: candidateRowsToInsert.length,
    });

    let insertedStories = [];

    if (candidateRowsToInsert.length > 0) {
      stage = "insert_stories";
      const { data: insertedData, error: insertError } = await withRetries(
        "Failed to insert published stories",
        () => supabase
          .from("stories")
          .insert(candidateRowsToInsert.map(buildStoryRow).filter(Boolean))
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

    for (const row of candidateRowsToInsert) {
      const publishedStoryId = publishedBySourceUrl.get(row.source_url);
      if (!publishedStoryId) continue;

      const { error: updateError } = await withRetries(
        `Failed to mark raw article ${row.id} as published`,
        () => supabase
          .from("raw_articles")
          .update({
            review_status: "published",
            published_story_id: publishedStoryId,
          })
          .eq("id", row.id),
      );

      if (updateError) throw new Error(updateError.message);
      markedPublished += 1;
    }

    logPublishStage(stage, { markedPublished });

    const result = {
      approved: approvedRows?.length || 0,
      republished: selectedRepublishRows.length,
      inserted: insertedStories.length,
      published: markedPublished,
      liveStories: liveStories.length + insertedStories.length,
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
