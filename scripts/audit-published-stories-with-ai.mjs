import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import {
  CATEGORY_CONFIG,
  REGION_CONFIG,
  getCategoryEmoji,
  sleep,
} from "./lib/ingestion-shared.mjs";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const REVIEW_INSTRUCTIONS = [
  "You classify already-published stories for BrightNews, a positive-news app.",
  "Keep only stories that are genuinely uplifting, concrete, and safe for a positive-only feed.",
  "Reject politics, opinion, conflict, disasters, outrage, death, illness-focused stories, crime, scams, fear, tragedy, or stories that are mostly about harm even if they contain a minor positive angle.",
  "Reject celebrity death, disease suffering, accidents, legal trouble, weather warnings, and general negative current events.",
  "Use pending when the item is mixed, ambiguous, or not clearly strong enough to keep.",
  "A story can be approved when it describes a clear positive outcome, improvement, rescue, recovery, scientific/health progress, community benefit, sports achievement, animal welfare, or environmental gain.",
  "Return only valid JSON with keys: action, confidence, genuinely_uplifting, category, region_code, contains_politics, contains_disaster, reason.",
].join(" ");

const getEnv = name => process.env[name];
const getRequiredEnv = name => {
  const value = getEnv(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const supabaseUrl = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const groqApiKey = getRequiredEnv("GROQ_API_KEY");
const groqModel = getEnv("GROQ_REVIEW_MODEL") || "llama-3.1-8b-instant";
const auditLimit = Number(getEnv("PUBLISHED_AUDIT_LIMIT") || 50);
const auditDelayMs = Number(getEnv("PUBLISHED_AUDIT_DELAY_MS") || 350);
const minimumConfidence = Number(getEnv("PUBLISHED_AUDIT_MIN_CONFIDENCE") || 0.6);
const dryRun = String(getEnv("PUBLISHED_AUDIT_DRY_RUN") || "false").toLowerCase() === "true";

if (!supabaseUrl) {
  throw new Error("Missing required environment variable: SUPABASE_URL or VITE_SUPABASE_URL");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const truncateText = (value, maxChars) => {
  const text = String(value || "").trim();
  if (!maxChars || text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trim()}... [truncated]`;
};

const buildArticleInput = row => JSON.stringify({
  source_name: row.source_name,
  title: truncateText(row.title, 240),
  description: truncateText(row.description, 1200),
  content: truncateText(row.content, 2200),
  current_category: row.category,
  current_region_code: row.region_code,
  source_url: row.source_url,
  previous_review_notes: row.review_notes,
}, null, 2);

const normalizeJsonText = text =>
  String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const classifyWithGroq = async row => {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: groqModel,
      messages: [
        {
          role: "system",
          content: [
            REVIEW_INSTRUCTIONS,
            `category must be one of: ${CATEGORY_CONFIG.map(item => item.category).join(", ")}.`,
            `region_code must be one of: ${REGION_CONFIG.map(item => item.code).join(", ")}.`,
          ].join(" "),
        },
        { role: "user", content: `Audit this already-published BrightNews story:\n${buildArticleInput(row)}` },
      ],
      temperature: 0,
      max_completion_tokens: 300,
      response_format: { type: "json_object" },
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || `Groq error ${response.status}`);
  }

  const outputText = normalizeJsonText(payload.choices?.[0]?.message?.content || "");
  if (!outputText) {
    throw new Error("Groq returned no structured output text.");
  }

  return JSON.parse(outputText);
};

const shouldKeepStory = review => {
  const confidence = Number.isFinite(Number(review.confidence))
    ? Math.max(0, Math.min(1, Number(review.confidence)))
    : 0;

  return (
    review.action === "approve" &&
    review.genuinely_uplifting === true &&
    confidence >= minimumConfidence &&
    review.contains_politics !== true &&
    review.contains_disaster !== true
  );
};

const normalizeCategory = (category, fallback) => (
  CATEGORY_CONFIG.some(item => item.category === category) ? category : fallback
);

const normalizeRegion = (regionCode, fallback) => (
  REGION_CONFIG.some(item => item.code === regionCode) ? regionCode : fallback
);

const loadAuditCandidates = async () => {
  const { data, error } = await supabase
    .from("raw_articles")
    .select("id, source_name, title, description, content, category, region_code, source_url, review_notes, published_story_id")
    .eq("review_status", "published")
    .not("published_story_id", "is", null)
    .not("review_notes", "ilike", "AI %")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(auditLimit);

  if (error) throw new Error(error.message);
  return data || [];
};

export const run = async () => {
  const rows = await loadAuditCandidates();
  const kept = [];
  const removed = [];
  const failed = [];

  for (const row of rows) {
    try {
      const review = await classifyWithGroq(row);
      const keep = shouldKeepStory(review);
      const confidence = Number(review.confidence || 0);
      const reason = String(review.reason || "No reason provided.").slice(0, 500);
      const category = normalizeCategory(review.category, row.category);
      const regionCode = normalizeRegion(review.region_code, row.region_code);
      const reviewNotes = `AI live audit ${keep ? "approved" : "rejected"} (${confidence.toFixed(2)}): ${reason}`;

      if (keep) {
        if (!dryRun) {
          const { error } = await supabase
            .from("raw_articles")
            .update({
              category,
              region_code: regionCode,
              emoji: getCategoryEmoji(category),
              review_notes: reviewNotes,
            })
            .eq("id", row.id);

          if (error) throw new Error(error.message);
        }

        kept.push({ id: row.id, storyId: row.published_story_id, title: row.title, confidence, reason });
      } else {
        if (!dryRun) {
          const { error: deleteStoryError } = await supabase
            .from("stories")
            .delete()
            .eq("id", row.published_story_id);

          if (deleteStoryError) throw new Error(deleteStoryError.message);

          const { error: rejectRawError } = await supabase
            .from("raw_articles")
            .update({
              review_status: "rejected",
              rejected_reason: "ai_live_audit",
              review_notes: reviewNotes,
              published_story_id: null,
            })
            .eq("id", row.id);

          if (rejectRawError) throw new Error(rejectRawError.message);
        }

        removed.push({ id: row.id, storyId: row.published_story_id, title: row.title, action: review.action, confidence, reason });
      }
    } catch (error) {
      failed.push({ id: row.id, storyId: row.published_story_id, title: row.title, error: error?.message || "Unknown error" });
    }

    if (auditDelayMs > 0) {
      await sleep(auditDelayMs);
    }
  }

  const result = {
    dryRun,
    reviewed: rows.length,
    kept: kept.length,
    removed: removed.length,
    failed: failed.length,
    provider: "groq",
    model: groqModel,
    removedStories: removed,
    failedStories: failed,
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
