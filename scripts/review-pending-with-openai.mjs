import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import {
  CATEGORY_CONFIG,
  REGION_CONFIG,
  getCategoryEmoji,
  inferReviewDecision,
  sleep,
} from "./lib/ingestion-shared.mjs";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: {
      type: "string",
      enum: ["approve", "pending", "reject"],
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
    },
    genuinely_uplifting: {
      type: "boolean",
    },
    category: {
      type: "string",
      enum: CATEGORY_CONFIG.map(item => item.category),
    },
    region_code: {
      type: "string",
      enum: REGION_CONFIG.map(item => item.code),
    },
    contains_politics: {
      type: "boolean",
    },
    contains_disaster: {
      type: "boolean",
    },
    reason: {
      type: "string",
    },
  },
  required: [
    "action",
    "confidence",
    "genuinely_uplifting",
    "category",
    "region_code",
    "contains_politics",
    "contains_disaster",
    "reason",
  ],
};

const REVIEW_INSTRUCTIONS = [
  "You classify news items for BrightNews, a positive-news app.",
  "Approve only if the story is genuinely uplifting, concrete, and safe for a positive-only feed.",
  "Reject politics, opinion, conflict, disasters, outrage, tragedy, or stories that are mostly about harm even if they contain a minor positive angle.",
  "Use pending when the item is mixed, ambiguous, or not clearly strong enough to approve.",
  "A story can be approved when it describes a clear positive outcome, improvement, rescue, recovery, scientific/health progress, community benefit, or environmental gain.",
  "Return only the schema fields requested.",
].join(" ");

const getEnv = name => process.env[name];
const getRequiredEnv = name => {
  const value = getEnv(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const supabaseUrl = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const openAiApiKey = getEnv("OPENAI_API_KEY");
const openAiModel = getEnv("OPENAI_REVIEW_MODEL") || "gpt-5-mini";
const reviewLimit = Number(getEnv("OPENAI_REVIEW_LIMIT") || 200);
const reviewDelayMs = Number(getEnv("OPENAI_REVIEW_DELAY_MS") || 300);
const maxRetries = Number(getEnv("OPENAI_REVIEW_MAX_RETRIES") || 3);
const minimumConfidence = Number(getEnv("OPENAI_REVIEW_MIN_CONFIDENCE") || 0.6);

if (!supabaseUrl) {
  throw new Error("Missing required environment variable: SUPABASE_URL or VITE_SUPABASE_URL");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const extractOutputText = payload => {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  for (const outputItem of payload.output || []) {
    if (!Array.isArray(outputItem.content)) continue;

    for (const contentItem of outputItem.content) {
      if (contentItem.type === "output_text" && contentItem.text) {
        return contentItem.text;
      }
    }
  }

  return "";
};

const classifyWithOpenAI = async row => {
  const articleInput = JSON.stringify({
    source_name: row.source_name,
    title: row.title,
    description: row.description,
    content: row.content,
    current_category: row.category,
    current_region_code: row.region_code,
    source_url: row.source_url,
    review_notes: row.review_notes,
  }, null, 2);

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openAiModel,
        instructions: REVIEW_INSTRUCTIONS,
        input: `Review this article:\n${articleInput}`,
        max_output_tokens: 300,
        text: {
          format: {
            type: "json_schema",
            name: "uplifting_article_review",
            schema: OPENAI_REVIEW_SCHEMA,
            strict: true,
          },
        },
      }),
    });

    const payload = await response.json();

    if (response.ok) {
      const outputText = extractOutputText(payload);
      if (!outputText) {
        throw new Error("OpenAI returned no structured output text.");
      }

      return JSON.parse(outputText);
    }

    const message = payload?.error?.message || `OpenAI error ${response.status}`;
    const shouldRetry = (response.status === 429 || response.status >= 500) && attempt < maxRetries;

    if (shouldRetry) {
      await sleep(1000 * (attempt + 1));
      continue;
    }

    throw new Error(message);
  }
};

const buildUpdatePayload = (row, review) => {
  const category = CATEGORY_CONFIG.some(item => item.category === review.category)
    ? review.category
    : row.category;
  const regionCode = REGION_CONFIG.some(item => item.code === review.region_code)
    ? review.region_code
    : row.region_code;

  let reviewStatus = "pending";
  let rejectedReason = "";

  if (
    review.action === "approve" &&
    review.genuinely_uplifting &&
    review.confidence >= minimumConfidence &&
    !review.contains_politics &&
    !review.contains_disaster
  ) {
    reviewStatus = "approved";
  } else if (
    review.action === "reject" ||
    review.contains_politics ||
    review.contains_disaster
  ) {
    reviewStatus = "rejected";
    rejectedReason = "openai_final_check";
  }

  return {
    review_status: reviewStatus,
    rejected_reason: rejectedReason,
    category,
    region_code: regionCode,
    emoji: getCategoryEmoji(category),
    review_notes: `OpenAI ${reviewStatus} (${review.confidence.toFixed(2)}): ${review.reason}`,
  };
};

export const run = async () => {
  if (!openAiApiKey) {
    const { data: rows, error } = await supabase
      .from("raw_articles")
      .select("id, vendor, title, description, content")
      .eq("review_status", "pending")
      .is("published_story_id", null)
      .order("published_at", { ascending: false })
      .limit(reviewLimit);

    if (error) throw new Error(error.message);

    let approved = 0;
    let pending = 0;
    let rejected = 0;

    for (const row of rows || []) {
      const decision = inferReviewDecision({
        vendor: row.vendor,
        title: row.title,
        description: row.description,
        content: row.content,
      });

      const { error: updateError } = await supabase
        .from("raw_articles")
        .update({
          review_status: decision.reviewStatus,
          rejected_reason: decision.rejectedReason,
          review_notes: decision.reviewNotes,
        })
        .eq("id", row.id);

      if (updateError) throw new Error(updateError.message);

      if (decision.reviewStatus === "approved") approved += 1;
      if (decision.reviewStatus === "pending") pending += 1;
      if (decision.reviewStatus === "rejected") rejected += 1;
    }

    const fallbackResult = {
      skipped: false,
      fallback: "trusted-source-heuristic",
      reviewed: rows?.length || 0,
      approved,
      pending,
      rejected,
      reason: "OPENAI_API_KEY is missing.",
    };

    console.log(JSON.stringify(fallbackResult, null, 2));
    return fallbackResult;
  }

  const { data: rows, error } = await supabase
    .from("raw_articles")
    .select("id, source_name, title, description, content, category, region_code, source_url, review_notes")
    .in("review_status", ["pending", "approved"])
    .is("published_story_id", null)
    .order("published_at", { ascending: false })
    .limit(reviewLimit);

  if (error) throw new Error(error.message);

  let approved = 0;
  let pending = 0;
  let rejected = 0;

  for (const row of rows || []) {
    const review = await classifyWithOpenAI(row);
    const payload = buildUpdatePayload(row, review);

    const { error: updateError } = await supabase
      .from("raw_articles")
      .update(payload)
      .eq("id", row.id);

    if (updateError) throw new Error(updateError.message);

    if (payload.review_status === "approved") approved += 1;
    if (payload.review_status === "pending") pending += 1;
    if (payload.review_status === "rejected") rejected += 1;

    await sleep(reviewDelayMs);
  }

  const result = {
    skipped: false,
    reviewed: rows?.length || 0,
    approved,
    pending,
    rejected,
    model: openAiModel,
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
