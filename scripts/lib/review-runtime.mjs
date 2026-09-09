export const DEFAULT_GROQ_REVIEW_MODEL = "qwen/qwen3.8-27b";
const FALLBACK_MODELS = [DEFAULT_GROQ_REVIEW_MODEL, "qwen/qwen3.6-27b"];

export const parseResetDelay = value => {
  let milliseconds = 0;
  for (const match of String(value || "").matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h)/g)) {
    milliseconds += Number(match[1]) * { ms: 1, s: 1000, m: 60000, h: 3600000 }[match[2]];
  }
  return milliseconds;
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

export const getRefreshFailures = (result, latestPublishedAt, now = Date.now()) => {
  const failures = [];
  const ingestion = ["gnews", "gdelt", "guardian", "googleNewsRss", "newsdata", "rss"].map(key => result[key]).filter(Boolean);
  if (ingestion.length && ingestion.every(stage => stage.skipped || stage.fetched === 0)) failures.push("All ingestion providers were skipped, failed, or returned no articles.");
  if (result.review?.skipped || result.review?.fallback || result.review?.aiFailures > 0) failures.push("AI review failed or used a degraded fallback.");
  if (result.published?.skipped) failures.push("Publishing failed.");
  const date = Date.parse(latestPublishedAt);
  if (!Number.isFinite(date) || now - date > 48 * 60 * 60 * 1000) failures.push("The newest published story is over 48 hours old or missing.");
  return failures;
};
