import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";

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
const platform = "x";
const defaultAccountHandle = "brightnewsglob";
const accountHandle = (getEnv("X_ACCOUNT_HANDLE") || defaultAccountHandle).replace(/^@/, "");
const brightNewsUrl = getEnv("BRIGHTNEWS_PUBLIC_URL") || "https://brightnews-three.vercel.app/";
const dryRun = String(getEnv("X_POST_DRY_RUN") || "").toLowerCase() === "true";
const maxPosts = Math.max(1, Number(getEnv("X_POST_MAX_STORIES") || 1));
const storyLookbackHours = Math.max(1, Number(getEnv("X_POST_LOOKBACK_HOURS") || 72));
const minSavedCount = Math.max(0, Number(getEnv("X_POST_MIN_SAVED_COUNT") || 0));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const encodeOAuth = value => encodeURIComponent(value).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

const buildOAuthHeader = ({ method, url, consumerKey, consumerSecret, accessToken, accessTokenSecret }) => {
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const signatureBase = [
    method.toUpperCase(),
    encodeOAuth(url),
    encodeOAuth(
      Object.entries(oauthParams)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${encodeOAuth(key)}=${encodeOAuth(value)}`)
        .join("&"),
    ),
  ].join("&");

  const signingKey = `${encodeOAuth(consumerSecret)}&${encodeOAuth(accessTokenSecret)}`;
  const oauthSignature = crypto.createHmac("sha1", signingKey).update(signatureBase).digest("base64");

  return `OAuth ${Object.entries({ ...oauthParams, oauth_signature: oauthSignature })
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeOAuth(key)}="${encodeOAuth(value)}"`)
    .join(", ")}`;
};

const normalizeText = value => (value || "").replace(/\s+/g, " ").trim();

const truncate = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const formatCategory = category => {
  const normalized = normalizeText(category);
  if (!normalized) return "positive news";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const buildPostText = story => {
  const source = normalizeText(story.location);
  const category = formatCategory(story.category);
  const baseSuffix = [
    "",
    `${category} from ${source || "BrightNews"}.`,
    "",
    `More positive stories: ${brightNewsUrl}`,
  ].join("\n");
  const maxHeadlineLength = 280 - baseSuffix.length - 2;
  const headline = truncate(normalizeText(story.headline), maxHeadlineLength);

  return `${headline}\n${baseSuffix}`;
};

const loadStoriesToPost = async () => {
  const since = new Date(Date.now() - storyLookbackHours * 60 * 60 * 1000).toISOString();
  const { data: postedRows, error: postedError } = await supabase
    .from("story_social_posts")
    .select("story_id")
    .eq("platform", platform)
    .order("posted_at", { ascending: false })
    .limit(1000);

  if (postedError) throw new Error(`Failed to load posted stories: ${postedError.message}`);

  const postedStoryIds = new Set((postedRows || []).map(row => row.story_id));
  const { data: stories, error: storiesError } = await supabase
    .from("stories")
    .select("id, headline, category, location, source_url, image_url, saved_count, published_at")
    .gte("published_at", since)
    .neq("image_url", "")
    .gte("saved_count", minSavedCount)
    .order("saved_count", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(50);

  if (storiesError) throw new Error(`Failed to load stories: ${storiesError.message}`);

  return (stories || [])
    .filter(story => !postedStoryIds.has(story.id))
    .slice(0, maxPosts);
};

const postToX = async text => {
  const url = "https://api.x.com/2/tweets";
  const consumerKey = getRequiredEnv("X_API_KEY");
  const consumerSecret = getRequiredEnv("X_API_SECRET");
  const accessToken = getRequiredEnv("X_ACCESS_TOKEN");
  const accessTokenSecret = getRequiredEnv("X_ACCESS_TOKEN_SECRET");
  const authorization = buildOAuthHeader({
    method: "POST",
    url,
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization,
      "content-type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`X API returned ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload?.data?.id || "";
};

const markPosted = async ({ story, postText, externalPostId }) => {
  const externalPostUrl = externalPostId ? `https://x.com/${accountHandle}/status/${externalPostId}` : "";
  const { error } = await supabase
    .from("story_social_posts")
    .insert({
      story_id: story.id,
      platform,
      external_post_id: externalPostId,
      external_post_url: externalPostUrl,
      post_text: postText,
    });

  if (error) throw new Error(`Failed to mark story as posted: ${error.message}`);

  return externalPostUrl;
};

export const run = async () => {
  const stories = await loadStoriesToPost();
  const posted = [];

  if (stories.length === 0) {
    const result = { platform, selected: 0, posted: 0, dryRun };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  for (const story of stories) {
    const postText = buildPostText(story);

    if (dryRun) {
      posted.push({ storyId: story.id, headline: story.headline, postText });
      continue;
    }

    const externalPostId = await postToX(postText);
    const externalPostUrl = await markPosted({ story, postText, externalPostId });
    posted.push({ storyId: story.id, headline: story.headline, externalPostId, externalPostUrl });
    await sleep(1500);
  }

  const result = { platform, selected: stories.length, posted: posted.length, dryRun, posts: posted };
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
