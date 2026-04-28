import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import {
  extractImageUrlFromArticle,
  extractImageUrlFromHtml,
  sleep,
} from "./lib/ingestion-shared.mjs";
import { isBlockedStoryImageUrl } from "../src/lib/storyImages.js";

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
const batchSize = Number(getEnv("BACKFILL_STORY_IMAGES_BATCH_SIZE") || 250);
const requestDelayMs = Number(getEnv("BACKFILL_STORY_IMAGES_DELAY_MS") || 50);
const onlyPublished = String(getEnv("BACKFILL_STORY_IMAGES_ONLY_PUBLISHED") || "true") !== "false";
const fetchSourcePages = String(getEnv("BACKFILL_STORY_IMAGES_FETCH_SOURCE") || "true") !== "false";
const fetchTimeoutMs = Number(getEnv("BACKFILL_STORY_IMAGES_FETCH_TIMEOUT_MS") || 6000);
const upsertChunkSize = Number(getEnv("BACKFILL_STORY_IMAGES_UPSERT_CHUNK_SIZE") || 100);

const isBadImageUrl = value => isBlockedStoryImageUrl(value);
const isUsableImageUrl = value => Boolean(value) && !isBadImageUrl(value);

const chunkArray = (rows, size) => {
  const chunks = [];

  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
};

const loadRawArticles = async () => {
  let query = supabase
    .from("raw_articles")
    .select("id, source_url, description, content, image_url, review_status, raw_payload, published_story_id")
    .or("image_url.is.null,image_url.eq.")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(batchSize);

  if (onlyPublished) {
    query = query.in("review_status", ["published", "approved"]);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || [])
    .filter(row => !row.image_url || isBadImageUrl(row.image_url));
};

const fetchedImageBySourceUrl = new Map();

const fetchImageFromSourceUrl = async sourceUrl => {
  if (!fetchSourcePages || !sourceUrl) return "";
  if (fetchedImageBySourceUrl.has(sourceUrl)) {
    return fetchedImageBySourceUrl.get(sourceUrl);
  }

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; BrightNewsImageBackfill/1.0; +https://brightnews.app)",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(fetchTimeoutMs),
      redirect: "follow",
    });

    if (!response.ok) {
      fetchedImageBySourceUrl.set(sourceUrl, "");
      return "";
    }

    const finalUrl = response.url || sourceUrl;
    const html = await response.text();
    const imageUrl = extractImageUrlFromHtml(html, finalUrl);
    fetchedImageBySourceUrl.set(sourceUrl, imageUrl);
    return imageUrl;
  } catch {
    fetchedImageBySourceUrl.set(sourceUrl, "");
    return "";
  }
};

const updateRawArticleImages = async rows => {
  if (rows.length === 0) return 0;
  for (const chunk of chunkArray(rows, upsertChunkSize)) {
    for (const row of chunk) {
      const { error } = await supabase
        .from("raw_articles")
        .update({ image_url: row.image_url })
        .eq("id", row.id);
      if (error) throw error;
    }
  }

  return rows.length;
};

const loadStoriesMissingImages = async () => {
  const { data, error } = await supabase
    .from("stories")
    .select("id, source_url, image_url, published_at")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(batchSize * 4);

  if (error) throw error;

  return (data || [])
    .filter(row => !row.image_url || isBadImageUrl(row.image_url))
    .slice(0, batchSize);
};

const loadRawImagesBySourceUrl = async sourceUrls => {
  const uniqueSourceUrls = [...new Set(sourceUrls.filter(Boolean))];
  if (uniqueSourceUrls.length === 0) return new Map();

  const imageBySourceUrl = new Map();

  for (const chunk of chunkArray(uniqueSourceUrls, upsertChunkSize)) {
    const { data, error } = await supabase
      .from("raw_articles")
      .select("source_url, image_url")
      .in("source_url", chunk)
      .neq("image_url", "");

    if (error) throw error;

    for (const row of data || []) {
      if (row.source_url && isUsableImageUrl(row.image_url)) {
        imageBySourceUrl.set(row.source_url, row.image_url);
      }
    }
  }

  return imageBySourceUrl;
};

const updateStoryImages = async rows => {
  if (rows.length === 0) return 0;

  for (const chunk of chunkArray(rows, upsertChunkSize)) {
    for (const row of chunk) {
      const { error } = await supabase
        .from("stories")
        .update({ image_url: row.image_url })
        .eq("id", row.id);

      if (error) throw error;
    }
  }

  return rows.length;
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

    const rawImageBySourceUrl = new Map();

    for (const row of raws || []) {
      if (row.source_url && row.image_url) {
        rawImageBySourceUrl.set(row.source_url, row.image_url);
      }
    }

    for (const story of storiesBySource || []) {
      const imageUrl = rawImageBySourceUrl.get(story.source_url);
      if (imageUrl) {
        updatesByStoryId.set(story.id, imageUrl);
      }
    }
  }

  const storyUpdates = Array.from(updatesByStoryId.entries()).map(([id, image_url]) => ({ id, image_url }));
  if (storyUpdates.length === 0) return 0;
  for (const row of storyUpdates) {
    const { error } = await supabase
      .from("stories")
      .update({ image_url: row.image_url })
      .eq("id", row.id);
    if (error) throw error;
  }

  return storyUpdates.length;
};

export const run = async () => {
  const rawArticles = await loadRawArticles();
  const updates = [];

  for (const row of rawArticles) {
    let imageUrl = extractImageUrlFromArticle(row);
    if (isBadImageUrl(imageUrl)) {
      imageUrl = "";
    }
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
  const syncedStoriesFromRawArticles = await syncStoriesFromRawArticles();
  const storiesMissingImages = await loadStoriesMissingImages();
  const rawImageBySourceUrl = await loadRawImagesBySourceUrl(storiesMissingImages.map(row => row.source_url));
  const storyUpdates = [];

  for (const story of storiesMissingImages) {
    let imageUrl = rawImageBySourceUrl.get(story.source_url) || "";

    if (!isUsableImageUrl(imageUrl)) {
      imageUrl = await fetchImageFromSourceUrl(story.source_url);
    }

    if (!isUsableImageUrl(imageUrl)) continue;

    storyUpdates.push({ id: story.id, image_url: imageUrl });
    if (requestDelayMs > 0) {
      await sleep(requestDelayMs);
    }
  }

  const updatedStories = await updateStoryImages(storyUpdates);

  const result = {
    scanned: rawArticles.length,
    scannedStories: storiesMissingImages.length,
    updatedRawArticles,
    syncedStoriesFromRawArticles,
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
