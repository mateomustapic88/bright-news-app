import test from "node:test";
import assert from "node:assert/strict";

process.env.VITE_SUPABASE_URL = "https://database.test";
process.env.SUPABASE_URL = "https://database.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-key";
process.env.GROQ_API_KEY = "test-only-key";
process.env.AI_REVIEW_REGION_CODES = "us";
process.env.AI_REVIEW_DELAY_MS = "1";
process.env.AI_REVIEW_MAX_RETRIES = "0";
const { run } = await import("../scripts/review-pending-with-groq.mjs");

test("an approval survives a later daily-quota pause; untouched articles remain pending", async () => {
  const originalFetch = globalThis.fetch;
  let classifications = 0;
  const writes = [];
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input);
    if (url.pathname.endsWith("/models")) return Response.json({ data: [{ id: "qwen/qwen3.8-27b" }] });
    if (url.pathname.endsWith("/chat/completions")) {
      classifications++;
      if (classifications === 2) return Response.json({ error: { message: "tokens per day (TPD) exhausted" } }, { status: 429 });
      return Response.json({ usage: { total_tokens: 500 }, choices: [{ message: { content: JSON.stringify({ action: "approve", confidence: 0.95, genuinely_uplifting: true, contains_politics: false, contains_disaster: false, category: "Science", region_code: "us", reason: "Concrete research benefit." }) } }] });
    }
    if (options.method === "PATCH") { writes.push(JSON.parse(options.body)); return new Response(null, { status: 204 }); }
    return Response.json([1, 2, 3, 4].map(id => ({ id, title: "Scientific progress", source_name: `Source ${id}`, region_code: "us", source_url: `https://news.test/${id}` })));
  };
  try {
    const result = await run();
    assert.equal(classifications, 2);
    assert.equal(result.reviewed, 1);
    assert.equal(result.approved, 1);
    assert.equal(result.deferred, 3);
    assert.match(result.deferredReason, /daily quota/);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].review_status, "approved");
  } finally { globalThis.fetch = originalFetch; }
});
