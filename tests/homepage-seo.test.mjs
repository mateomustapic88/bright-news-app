import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { HOME_TITLE, HOME_DESCRIPTION, loadHomepageStories, renderHomepageSnapshot, selectHomepageStories } from "../scripts/lib/homepage-seo.mjs";

test("homepage snapshot keeps only recent complete stories with unique safe source URLs", () => {
  const now = Date.parse("2026-09-10T12:00:00Z");
  const row = { headline: "A discovery", summary: "Some progress", source_url: "https://news.test/story", published_at: "2026-09-09T10:00:00Z" };
  const rows = [row, row, { ...row, source_url: "javascript:alert(1)" }, { ...row, source_url: "https://news.test/old", published_at: "2020-01-01" }, { ...row, source_url: "https://news.test/future", published_at: "2027-01-01" }, { ...row, source_url: "https://news.test/empty", summary: "" }];
  assert.deepEqual(selectHomepageStories(rows, now), [row]);
});

test("snapshot escapes publisher text and blocks non-HTTP images", () => {
  const html = renderHomepageSnapshot([{ headline: '<script>alert("bad")</script>', summary: "A & B", source_url: "https://news.test/story", image_url: "javascript:alert(1)", published_at: "2026-09-09", location: "Test" }]);
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("javascript:"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("A &amp; B"));
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  assert.ok(html.includes('<a href="/">BrightNews</a>'));
});

test("snapshot uses only the public key and handles missing configuration", async () => {
  assert.deepEqual(await loadHomepageStories({}, () => assert.fail("Unexpected request")), []);
  await loadHomepageStories({ VITE_SUPABASE_URL: "https://db.test", VITE_SUPABASE_ANON_KEY: "public-key", SUPABASE_SERVICE_ROLE_KEY: "private-key" }, async (url, options) => {
    assert.equal(url.pathname, "/rest/v1/stories");
    assert.equal(options.headers.apikey, "public-key");
    assert.ok(!JSON.stringify(options).includes("private-key"));
    return Response.json([]);
  });
  await assert.rejects(loadHomepageStories({ VITE_SUPABASE_URL: "https://db.test", VITE_SUPABASE_ANON_KEY: "public-key" }, async () => new Response(null, { status: 503 })), /503/);
});

test("homepage metadata stays branded and self-canonical", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(html.includes(`<title>${HOME_TITLE.replaceAll("&", "&amp;")}</title>`));
  assert.ok(html.includes(HOME_DESCRIPTION));
  assert.ok(html.includes('rel="canonical" href="https://brightnews.app/"'));
  assert.ok(!html.includes("<noscript>"));
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.equal(config.redirects[0].has[0].value, "www.brightnews.app");
  assert.equal(config.redirects[0].destination, "https://brightnews.app/:path*");
});
