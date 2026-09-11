import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getNewsHealthFailures, parseDatabaseDate } from "../scripts/lib/news-health.mjs";
import { createReviewBudget, getGroqRetryDelay, ReviewDeferredError } from "../scripts/lib/review-runtime.mjs";

test("daily quotas stop immediately instead of retrying every article", () => {
  const response = new Response(null, { status: 429, headers: { "retry-after": "300" } });
  assert.throws(() => getGroqRetryDelay(response, "tokens per day (TPD): Limit 200000", 0), ReviewDeferredError);
  assert.throws(() => getGroqRetryDelay(response, "requests per day (RPD)", 0), /daily quota/);
  assert.throws(() => getGroqRetryDelay(response, "minute limit", 0), /cooldown/);
});

test("short rate limits respect Retry-After without a premature capped retry", () => {
  const response = new Response(null, { status: 429, headers: { "retry-after": "5", "x-ratelimit-reset-tokens": "2s" } });
  assert.equal(getGroqRetryDelay(response, "minute limit", 0), 5000);
  const date = new Response(null, { status: 503, headers: { "retry-after": "Fri, 11 Sep 2026 12:00:10 GMT" } });
  assert.equal(getGroqRetryDelay(date, "unavailable", 0, Date.parse("2026-09-11T12:00:00Z")), 10000);
});

test("token and time budgets bound the whole review stage", () => {
  let now = 0;
  const budget = createReviewBudget({ maxTokens: 1000, maxDurationMs: 5000, now: () => now });
  budget.reserve(800);
  budget.reconcile(800, 400);
  assert.equal(budget.tokens, 400);
  assert.throws(() => budget.reserve(700), /token budget/);
  budget.reserve(500);
  assert.equal(budget.tokens, 900);
  assert.throws(() => budget.checkWait(5000), /time budget/);
  now = 5001;
  assert.throws(() => budget.reserve(1), /time budget/);
});

test("freshness checks distinguish publishing activity from source dates", () => {
  assert.equal(parseDatabaseDate("2026-09-11T12:00:00"), Date.parse("2026-09-11T12:00:00Z"));
  const now = Date.parse("2026-09-11T12:00:00Z");
  const fresh = { latestCreatedAt: "2026-09-11T11:00:00Z", latestPublishedAt: "2026-09-11T10:00:00Z", approvedCount: 0 };
  assert.deepEqual(getNewsHealthFailures(fresh, now), []);
  assert.equal(getNewsHealthFailures({ ...fresh, latestCreatedAt: "2026-09-09T10:00:00Z" }, now).length, 1);
  assert.equal(getNewsHealthFailures({ ...fresh, latestPublishedAt: "2026-09-01T10:00:00Z" }, now).length, 1);
  assert.equal(getNewsHealthFailures({ ...fresh, approvedCount: 200 }, now).length, 1);
  assert.equal(getNewsHealthFailures({}, now).length, 2);
  assert.equal(getNewsHealthFailures({ ...fresh, latestPublishedAt: "2027-01-01" }, now).length, 1);
});

test("workflow reserves publishing time and runs it even after review failure", () => {
  const workflow = readFileSync(new URL("../.github/workflows/refresh-news.yml", import.meta.url), "utf8");
  assert.equal((workflow.match(/run: node scripts\/publish-approved-stories.mjs/g) || []).length, 2);
  assert.match(workflow, /Publish approvals even if ingestion or review failed\n\s+if:.*!cancelled\(\).*steps.ready.outcome == 'success'.*\n\s+timeout-minutes: 10/);
  assert.match(workflow, /Review a bounded batch with Groq\n\s+if:.*\n\s+timeout-minutes: 10/);
  assert.ok(workflow.includes("--ingest-only"));
  const watchdog = readFileSync(new URL("../.github/workflows/news-health.yml", import.meta.url), "utf8");
  assert.ok(watchdog.includes("issues: write"));
  assert.ok(watchdog.includes('cron: "43 */2 * * *"'));
});
