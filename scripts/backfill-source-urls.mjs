import { createClient } from "@supabase/supabase-js";
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

const PLACEHOLDER_HOSTS = new Set(["example.com", "www.example.com"]);

const isPlaceholderUrl = value => {
  const normalized = normalizeExternalUrl(value);
  if (!normalized) return true;

  try {
    return PLACEHOLDER_HOSTS.has(new URL(normalized).hostname.toLowerCase());
  } catch {
    return true;
  }
};

const getRawPayloadUrl = rawPayload => {
  if (!rawPayload || typeof rawPayload !== "object") return "";

  const candidates = [
    rawPayload.url,
    rawPayload.link,
    rawPayload.source_url,
    rawPayload.canonical_url,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeExternalUrl(candidate);
    if (normalized && !isPlaceholderUrl(normalized)) {
      return normalized;
    }
  }

  return "";
};

const getBestRawArticleUrl = row => {
  const payloadUrl = getRawPayloadUrl(row.raw_payload);
  if (payloadUrl) return payloadUrl;

  const normalizedSourceUrl = normalizeExternalUrl(row.source_url);
  if (normalizedSourceUrl && !isPlaceholderUrl(normalizedSourceUrl)) {
    return normalizedSourceUrl;
  }

  return "";
};

const updateRow = async (table, id, sourceUrl) => {
  const { error } = await supabase
    .from(table)
    .update({ source_url: sourceUrl })
    .eq("id", id);

  if (error) throw new Error(`${table}:${id} ${error.message}`);
};

const run = async () => {
  const { data: rawArticles, error: rawArticlesError } = await supabase
    .from("raw_articles")
    .select("id, source_url, raw_payload, published_story_id");

  if (rawArticlesError) throw new Error(rawArticlesError.message);

  const { data: stories, error: storiesError } = await supabase
    .from("stories")
    .select("id, source_url");

  if (storiesError) throw new Error(storiesError.message);

  const rawArticleUpdates = [];
  const storyUpdates = [];

  const rawArticleByPublishedStoryId = new Map();

  for (const row of rawArticles || []) {
    const nextSourceUrl = getBestRawArticleUrl(row);
    const currentSourceUrl = normalizeExternalUrl(row.source_url);

    if (row.published_story_id && nextSourceUrl) {
      rawArticleByPublishedStoryId.set(row.published_story_id, nextSourceUrl);
    }

    if (nextSourceUrl && nextSourceUrl !== currentSourceUrl) {
      rawArticleUpdates.push({ id: row.id, sourceUrl: nextSourceUrl });
    }
  }

  for (const story of stories || []) {
    const currentSourceUrl = normalizeExternalUrl(story.source_url);
    const replacement = rawArticleByPublishedStoryId.get(story.id);

    if (!replacement) continue;
    if (replacement === currentSourceUrl) continue;
    if (!isPlaceholderUrl(story.source_url) && currentSourceUrl) continue;

    storyUpdates.push({ id: story.id, sourceUrl: replacement });
  }

  for (const update of rawArticleUpdates) {
    await updateRow("raw_articles", update.id, update.sourceUrl);
  }

  for (const update of storyUpdates) {
    await updateRow("stories", update.id, update.sourceUrl);
  }

  console.log(JSON.stringify({
    rawArticlesScanned: rawArticles?.length || 0,
    storiesScanned: stories?.length || 0,
    rawArticlesUpdated: rawArticleUpdates.length,
    storiesUpdated: storyUpdates.length,
  }, null, 2));
};

run().catch(error => {
  console.error(error.message);
  process.exit(1);
});
