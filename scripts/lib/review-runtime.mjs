export const DEFAULT_GROQ_REVIEW_MODEL = "qwen/qwen3.8-27b";
const FALLBACK_MODELS = [DEFAULT_GROQ_REVIEW_MODEL, "qwen/qwen3.6-27b"];

export const parseResetDelay = value => {
  let milliseconds = 0;
  for (const match of String(value || "").matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h)/g)) {
    milliseconds += Number(match[1]) * { ms: 1, s: 1000, m: 60000, h: 3600000 }[match[2]];
  }
  return milliseconds;
};

export class ReviewDeferredError extends Error {
  constructor(reason) {
    super(reason);
    this.name = "ReviewDeferredError";
  }
}

export const getGroqRetryDelay = (response, message, attempt, now = Date.now()) => {
  // Daily limits cannot be fixed by repeating the same request for every queued article.
  if (response.status === 429 && /tokens per day|requests per day|\bTPD\b|\bRPD\b/i.test(message)) {
    throw new ReviewDeferredError("Groq daily quota exhausted; remaining articles will be reviewed on a later run.");
  }
  const retryAfter = response.headers.get("retry-after");
  const delay = retryAfter && !Number.isFinite(Number(retryAfter))
    ? Math.max(0, Date.parse(retryAfter) - now) : Number(retryAfter || 0) * 1000;
  const wait = Math.max(1000 * (attempt + 1), Number.isFinite(delay) ? delay : 0,
    parseResetDelay(response.headers.get("x-ratelimit-reset-tokens")));
  if (wait > 30_000) {
    if (response.status === 429) throw new ReviewDeferredError("Groq requires a long cooldown; deferring the remaining queue.");
    throw new Error(`Groq service error ${response.status} requires a long retry delay: ${message}`);
  }
  return wait;
};

export const createReviewBudget = ({ maxTokens = 30_000, maxDurationMs = 8 * 60_000, now = Date.now } = {}) => {
  const deadline = now() + maxDurationMs;
  let tokens = 0;
  return {
    reserve(estimatedTokens) {
      if (now() >= deadline) throw new ReviewDeferredError("Review time budget reached.");
      if (tokens + estimatedTokens > maxTokens) throw new ReviewDeferredError("Review token budget reached.");
      tokens += estimatedTokens;
    },
    reconcile(reserved, actual) {
      if (Number.isFinite(actual) && actual > 0) tokens += actual - reserved;
    },
    checkWait(delay) {
      if (now() + delay >= deadline) throw new ReviewDeferredError("Review time budget reached before retry.");
    },
    get tokens() { return tokens; },
  };
};

export const chooseReviewModel = (models, requested) => {
  const active = new Set(models.filter(model => model.active !== false).map(model => model.id));
  const selected = [requested, ...FALLBACK_MODELS].filter(Boolean).find(model => active.has(model));
  if (!selected) throw new Error("No configured Groq review model is available. Update GROQ_REVIEW_MODEL.");
  return selected;
};

export const interleaveGroups = (groups, limit) => {
  const result = [];
  for (let index = 0; result.length < limit; index += 1) {
    let found = false;
    for (const group of groups) {
      if (index < group.length) {
        result.push(group[index]);
        found = true;
        if (result.length === limit) break;
      }
    }
    if (!found) break;
  }
  return result;
};

export const balancePublishers = (rows, limit) => {
  const groups = new Map();
  for (const row of rows) {
    const source = row.source_name || row.vendor || "unknown";
    if (!groups.has(source)) groups.set(source, []);
    groups.get(source).push(row);
  }
  return interleaveGroups([...groups.values()], limit);
};

export const hasReviewFailure = result => Boolean(result?.skipped || result?.fallback || result?.aiFailures > 0);

export const getRefreshFailures = (result, latestPublishedAt, now = Date.now()) => {
  const failures = [];
  const ingestion = ["gnews", "gdelt", "guardian", "googleNewsRss", "newsdata", "rss"].map(key => result[key]).filter(Boolean);
  if (ingestion.length && ingestion.every(stage => stage.skipped || stage.fetched === 0)) failures.push("All ingestion providers were skipped, failed, or returned no articles.");
  if (hasReviewFailure(result.review)) failures.push("AI review failed or used a degraded fallback.");
  if (result.published?.skipped) failures.push("Publishing failed.");
  const date = Date.parse(latestPublishedAt);
  if (!Number.isFinite(date) || now - date > 48 * 60 * 60 * 1000) failures.push("The newest published story is over 48 hours old or missing.");
  return failures;
};
