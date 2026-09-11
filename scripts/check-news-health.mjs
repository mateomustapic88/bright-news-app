import { createClient } from "@supabase/supabase-js";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { REGION_CONFIG } from "./lib/ingestion-shared.mjs";
import { getNewsHealthFailures, parseDatabaseDate } from "./lib/news-health.mjs";

export const run = async () => {
  const db = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(20_000) }) },
  });
  const now = new Date().toISOString();
  const { data: created, error: createdError } = await db.from("stories").select("created_at")
    .order("created_at", { ascending: false, nullsFirst: false }).limit(1);
  const { data: published, error: publishedError } = await db.from("stories").select("published_at")
    .lte("published_at", now).order("published_at", { ascending: false, nullsFirst: false }).limit(1);
  const { count: approvedCount, error: queueError } = await db.from("raw_articles")
    .select("id", { head: true, count: "exact" }).eq("review_status", "approved").is("published_story_id", null);
  for (const error of [createdError, publishedError, queueError]) if (error) throw new Error(error.message);
  const health = { latestCreatedAt: created?.[0]?.created_at, latestPublishedAt: published?.[0]?.published_at, approvedCount, regions: [] };
  for (const region of REGION_CONFIG) {
    const { data, error } = await db.from("stories").select("published_at")
      .eq("region_code", region.code).lte("published_at", now)
      .order("published_at", { ascending: false, nullsFirst: false }).limit(1);
    if (error) throw new Error(`Could not check ${region.code}: ${error.message}`);
    const latest = data?.[0]?.published_at || null;
    const stale = !latest || Date.now() - parseDatabaseDate(latest) > 72 * 3600_000;
    health.regions.push({ region: region.code, latest, stale });
    if (stale && process.env.GITHUB_ACTIONS) console.warn(`::warning::${region.code} has no source story from the last 72 hours. Check coverage; do not bypass moderation.`);
  }
  const failures = getNewsHealthFailures(health);
  console.log(JSON.stringify({ ...health, failures }, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `## Publishing health\n\nLast insertion: ${health.latestCreatedAt || "none"}\n\nLatest source date: ${health.latestPublishedAt || "none"}\n\nApproved backlog: ${approvedCount}\n\n${failures.join("\n\n") || "Global freshness checks passed."}\n\n| Edition | Newest source date | Status |\n| --- | --- | --- |\n${health.regions.map(item => `| ${item.region} | ${item.latest || "none"} | ${item.stale ? "Check coverage" : "Recent"} |`).join("\n")}\n`);
  if (failures.length) throw new Error(failures.join(" "));
  return health;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch(error => { console.error(error.message); process.exitCode = 1; });
}
