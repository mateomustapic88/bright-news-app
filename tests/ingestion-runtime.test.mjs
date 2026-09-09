import test from "node:test";
import assert from "node:assert/strict";
import { chooseReviewModel, DEFAULT_GROQ_REVIEW_MODEL, interleaveGroups, balancePublishers, getRefreshFailures, parseResetDelay } from "../scripts/lib/review-runtime.mjs";
import { upsertRawArticles } from "../scripts/lib/ingestion-shared.mjs";

test("unavailable configured models use a known available Groq replacement", () => {
  assert.equal(chooseReviewModel([{ id: DEFAULT_GROQ_REVIEW_MODEL, active: true }], "retired-model"), DEFAULT_GROQ_REVIEW_MODEL);
  assert.equal(chooseReviewModel([{ id: "configured", active: true }], "configured"), "configured");
  assert.throws(() => chooseReviewModel([{ id: DEFAULT_GROQ_REVIEW_MODEL, active: false }], "retired"), /No configured/);
  assert.throws(() => chooseReviewModel([{ id: "unknown-model" }], "retired"), /No configured/);
});

test("Groq reset durations support compound and fractional units", () => {
  assert.equal(parseResetDelay("1m2.5s"), 62500);
  assert.equal(parseResetDelay("250ms"), 250);
  assert.equal(parseResetDelay(null), 0);
});

test("a global review limit cannot let the newest country consume every slot", () => {
  assert.deepEqual(interleaveGroups([["us1", "us2", "us3"], ["hr1", "hr2"], ["uk1"]], 4), ["us1", "hr1", "uk1", "us2"]);
  assert.deepEqual(interleaveGroups([[], ["one"]], 10), ["one"]);
  assert.deepEqual(interleaveGroups([["one"]], 0), []);
});

test("high-volume publishers leave room for smaller sources", () => {
  const rows = [{ id: 1, source_name: "Large" }, { id: 2, source_name: "Large" }, { id: 3, source_name: "Small" }];
  assert.deepEqual(balancePublishers(rows, 2).map(row => row.id), [1, 3]);
});

test("refresh fails on review errors even with a fresh feed and successful publishing", () => {
  const now = Date.parse("2026-09-09T12:00:00Z");
  assert.deepEqual(getRefreshFailures({ review: { aiFailures: 0 }, published: {} }, new Date(now).toISOString(), now), []);
  assert.equal(getRefreshFailures({ review: { aiFailures: 5 }, published: {} }, new Date(now).toISOString(), now).length, 1);
  assert.equal(getRefreshFailures({ review: { skipped: true }, published: { skipped: true } }, "2026-09-01", now).length, 3);
  assert.equal(getRefreshFailures({ review: {}, published: {} }, null, now).length, 1);
  assert.equal(getRefreshFailures({ rss: { fetched: 0 }, guardian: { skipped: true }, review: {}, published: {} }, new Date(now).toISOString(), now).length, 1);
  assert.equal(getRefreshFailures({ rss: { fetched: 3 }, guardian: { skipped: true }, review: {}, published: {} }, new Date(now).toISOString(), now).length, 0);
});

test("re-ingestion preserves approved and published decisions and AI geography", async () => {
  for (const status of ["approved", "published", "pending"]) {
    const existing = { source_url: "https://example.com/story", review_status: status, review_notes: `AI ${status}`, rejected_reason: "", published_story_id: status === "published" ? "live-id" : null, region_code: "au", country_code: "au", category: "Science", emoji: "S" };
    let written;
    const db = { from: () => ({ select: () => ({ in: async () => ({ data: [existing], error: null }) }), upsert: async rows => { written = rows; return { error: null }; } }) };
    await upsertRawArticles(db, [{ source_url: existing.source_url, review_status: "rejected", region_code: "us", country_code: "us", category: "Community", title: "Updated title" }]);
    assert.equal(written[0].review_status, status);
    assert.equal(written[0].region_code, "au");
    assert.equal(written[0].published_story_id, existing.published_story_id);
    assert.equal(written[0].title, "Updated title");
  }
});
