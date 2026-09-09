import test from "node:test";
import assert from "node:assert/strict";

test("publishing reconciles existing stories and inserts duplicate source URLs only once", async t => {
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
    else if (method === "GET" && url.pathname.endsWith("/stories")) data = [{ id: "live-existing", source_url: existingUrl }];
    else if (method === "POST" && url.pathname.endsWith("/stories")) {
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
