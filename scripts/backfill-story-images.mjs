import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import {
  extractImageUrlFromArticle,
  extractImageUrlFromHtml,
  sleep,
} from "./lib/ingestion-shared.mjs";

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
const batchSize = Number(getEnv("BACKFILL_STORY_IMAGES_BATCH_SIZE") || 50);
const requestDelayMs = Number(getEnv("BACKFILL_STORY_IMAGES_DELAY_MS") || 50);
const onlyPublished = String(getEnv("BACKFILL_STORY_IMAGES_ONLY_PUBLISHED") || "true") !== "false";
const fetchSourcePages = String(getEnv("BACKFILL_STORY_IMAGES_FETCH_SOURCE") || "true") !== "false";
const fetchTimeoutMs = Number(getEnv("BACKFILL_STORY_IMAGES_FETCH_TIMEOUT_MS") || 6000);

const loadRawArticles = async () => {
  let query = supabase
    .from("raw_articles")
    .select("id, source_url, description, content, image_url, review_status, raw_payload, published_story_id")
    .eq("image_url", "")
    .order("published_at", { ascending: false })
    .limit(batchSize);

  if (onlyPublished) {
    query = query.in("review_status", ["published", "approved"]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

const fetchImageFromSourceUrl = async sourceUrl => {
  if (!fetchSourcePages || !sourceUrl || sourceUrl.includes("news.google.com")) return "";

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; BrightNewsImageBackfill/1.0; +https://brightnews.app)",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(fetchTimeoutMs),
      redirect: "follow",
    });

    if (!response.ok) return "";
    const html = await response.text();
    return extractImageUrlFromHtml(html);
  } catch {
    return "";
  }
};

const updateRawArticleImages = async rows => {
  if (rows.length === 0) return 0;
  let updated = 0;

  for (const row of rows) {
    const { error } = await supabase
      .from("raw_articles")
      .update({ image_url: row.image_url })
      .eq("id", row.id);

    if (error) throw error;
    updated += 1;
  }

  return updated;
};

const syncStoriesFromRawArticles = async () => {
  const { data: raws, error: rawError } = await supabase
    .from("raw_articles")
    .select("published_story_id, source_url, image_url")
    .neq("image_url", "")
    .in("review_status", ["published", "approved"])
    .limit(5000);

  if (rawError) throw rawError;

  const updatesByStoryId = new Map();
  const sourceUrls = [];

  for (const row of raws || []) {
    if (row.published_story_id) {
      updatesByStoryId.set(row.published_story_id, row.image_url);
    } else if (row.source_url) {
      sourceUrls.push(row.source_url);
    }
  }

  if (sourceUrls.length > 0) {
    const { data: storiesBySource, error: sourceError } = await supabase
      .from("stories")
      .select("id, source_url, image_url")
      .in("source_url", sourceUrls);

    if (sourceError) throw sourceError;

    for (const story of storiesBySource || []) {
      const matchingRaw = (raws || []).find(row => row.source_url === story.source_url && row.image_url);
      if (matchingRaw?.image_url) {
        updatesByStoryId.set(story.id, matchingRaw.image_url);
      }
    }
  }

  const storyUpdates = Array.from(updatesByStoryId.entries()).map(([id, image_url]) => ({ id, image_url }));
  if (storyUpdates.length === 0) return 0;

  let updated = 0;
  for (const row of storyUpdates) {
    const { error } = await supabase
      .from("stories")
      .update({ image_url: row.image_url })
      .eq("id", row.id);

    if (error) throw error;
    updated += 1;
  }

  return updated;
};

export const run = async () => {
  const rawArticles = await loadRawArticles();
  const updates = [];

  for (const row of rawArticles) {
    let imageUrl = extractImageUrlFromArticle(row);
    if (!imageUrl) {
      imageUrl = await fetchImageFromSourceUrl(row.source_url);
    }
    if (!imageUrl) continue;
    updates.push({ id: row.id, image_url: imageUrl });
    if (requestDelayMs > 0) {
      await sleep(requestDelayMs);
    }
  }

  const updatedRawArticles = await updateRawArticleImages(updates);
  const updatedStories = await syncStoriesFromRawArticles();

  const result = {
    scanned: rawArticles.length,
    updatedRawArticles,
    updatedStories,
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
};

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  run().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
