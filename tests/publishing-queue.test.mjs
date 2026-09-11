import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const configurePublisherEnvironment = t => {
  const environment = {
    SUPABASE_URL: "https://publishing-test.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "test-only-key",
    PUBLISH_REPUBLISH_LIMIT: "0",
  };
  const original = Object.fromEntries(Object.keys(environment).map(key => [key, process.env[key]]));
  Object.assign(process.env, environment);
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
};

test("publishing reconciles existing stories and inserts duplicate source URLs only once", async t => {
  configurePublisherEnvironment(t);

  const existingUrl = "https://news.test/existing";
  const newUrl = "https://news.test/new";
  const rows = [
    { id: "raw-existing", source_url: existingUrl },
    { id: "raw-new-a", source_url: newUrl },
    { id: "raw-new-b", source_url: newUrl },
  ].map(row => ({ ...row, title: "Community project succeeds", region_code: "us", category: "People" }));
  const writes = [];
  let inserted = [];
  t.mock.method(globalThis, "fetch", async (input, options = {}) => {
    const url = new URL(input);
    assert.equal(url.hostname, "publishing-test.invalid");
    const method = options.method || "GET";
    let data;
    if (method === "GET" && url.pathname.endsWith("/raw_articles")) data = rows;
    else if (method === "GET" && url.pathname.endsWith("/stories")) data = [{ id: "live-existing", source_url: existingUrl }, ...(inserted.length ? [{ id: "live-new", source_url: newUrl }] : [])];
    else if (method === "POST" && url.pathname.endsWith("/stories")) {
      assert.equal(url.searchParams.get("on_conflict"), "source_url");
      assert.match(new Headers(options.headers).get("prefer"), /resolution=ignore-duplicates/);
      inserted = JSON.parse(options.body);
      data = [{ id: "live-new", source_url: newUrl }];
    } else if (method === "PATCH" && url.pathname.endsWith("/raw_articles")) {
      writes.push({ id: url.searchParams.get("id"), ...JSON.parse(options.body) });
      return new Response(null, { status: 204 });
    } else assert.fail(`Unexpected request: ${method} ${url.pathname}`);
    return Response.json(data);
  });

  const { run } = await import("../scripts/publish-approved-stories.mjs");
  const result = await run();
  assert.equal(inserted.length, 1);
  assert.equal(result.inserted, 1);
  assert.equal(result.published, 3);
  assert.deepEqual(writes, [
    { id: "eq.raw-existing", review_status: "published", published_story_id: "live-existing" },
    { id: "eq.raw-new-a", review_status: "published", published_story_id: "live-new" },
    { id: "eq.raw-new-b", review_status: "published", published_story_id: "live-new" },
  ]);
});

test("an overlapping publisher's insert is reconciled without overwriting it", async t => {
  configurePublisherEnvironment(t);
  const url = "https://news.test/concurrent";
  let storyReads = 0;
  let inserted = 0;
  const updates = [];
  t.mock.method(globalThis, "fetch", async (input, options = {}) => {
    const request = new URL(input);
    const method = options.method || "GET";
    if (method === "GET" && request.pathname.endsWith("/raw_articles")) {
      assert.equal(request.searchParams.get("review_status"), "eq.approved");
      return Response.json([{ id: "raw-concurrent", source_url: url, title: "Positive outcome", region_code: "us" }]);
    }
    if (method === "GET" && request.pathname.endsWith("/stories")) {
      return Response.json(storyReads++ === 0 ? [] : [{ id: "other-publisher-id", source_url: url }]);
    }
    if (method === "POST" && request.pathname.endsWith("/stories")) {
      inserted++;
      assert.match(new Headers(options.headers).get("prefer"), /resolution=ignore-duplicates/);
      return Response.json([]);
    }
    if (method === "PATCH" && request.pathname.endsWith("/raw_articles")) {
      updates.push(JSON.parse(options.body));
      return new Response(null, { status: 204 });
    }
    assert.fail(`Unexpected request: ${method} ${request.pathname}`);
  });
  const { run } = await import("../scripts/publish-approved-stories.mjs");
  const result = await run();
  assert.equal(inserted, 1);
  assert.equal(result.inserted, 0);
  assert.equal(result.published, 1);
  assert.deepEqual(updates, [{ review_status: "published", published_story_id: "other-publisher-id" }]);
});

test("independent publisher is scheduled and has no AI or ingestion dependency", () => {
  const workflow = readFileSync(new URL("../.github/workflows/publish-approved.yml", import.meta.url), "utf8");
  assert.ok(workflow.includes('cron: "7,37 * * * *"'));
  assert.ok(workflow.includes("node scripts/publish-approved-stories.mjs"));
  assert.ok(!workflow.includes("GROQ_API_KEY"));
  assert.ok(!workflow.includes("scripts/refresh-news.mjs"));
  assert.ok(!workflow.includes("needs:"));
});
