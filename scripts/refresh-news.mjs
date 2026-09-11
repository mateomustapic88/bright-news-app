import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { appendFileSync } from "node:fs";
import { getRefreshFailures } from "./lib/review-runtime.mjs";
import { REGION_CONFIG } from "./lib/ingestion-shared.mjs";
import { run as runGnewsIngest } from "./ingest-gnews.mjs";
import { run as runGdeltIngest } from "./ingest-gdelt.mjs";
import { run as runGuardianIngest } from "./ingest-guardian.mjs";
import { run as runGoogleNewsRssIngest } from "./ingest-google-news-rss.mjs";
import { run as runNewsDataIngest } from "./ingest-newsdata.mjs";
import { run as runRssIngest } from "./ingest-rss.mjs";
import { run as runGroqReview } from "./review-pending-with-groq.mjs";
import { run as runPublishApproved } from "./publish-approved-stories.mjs";

export const run = async ({ ingestOnly = false } = {}) => {
  // Drain completed reviews before slow feeds or AI outages can delay them again.
  if (!ingestOnly) await runPublishApproved();
  const gnews = { skipped: false };
  const gdelt = { skipped: false };
  const guardian = { skipped: false };
  const googleNewsRss = { skipped: false };
  const newsdata = { skipped: false };
  const rss = { skipped: false };
  const review = { skipped: false };
  const published = { skipped: false };

  try {
    Object.assign(gnews, await runGnewsIngest());
  } catch (error) {
    gnews.skipped = true;
    gnews.error = error.message;
  }

  try {
    Object.assign(gdelt, await runGdeltIngest());
  } catch (error) {
    gdelt.skipped = true;
    gdelt.error = error.message;
  }

  try {
    Object.assign(guardian, await runGuardianIngest());
  } catch (error) {
    guardian.skipped = true;
    guardian.error = error.message;
  }

  try {
    Object.assign(googleNewsRss, await runGoogleNewsRssIngest());
  } catch (error) {
    googleNewsRss.skipped = true;
    googleNewsRss.error = error.message;
  }

  try {
    Object.assign(newsdata, await runNewsDataIngest());
  } catch (error) {
    newsdata.skipped = true;
    newsdata.error = error.message;
  }

  try {
    Object.assign(rss, await runRssIngest());
  } catch (error) {
    rss.skipped = true;
    rss.error = error.message;
  }

  if (ingestOnly) {
    const result = { gnews, gdelt, guardian, googleNewsRss, newsdata, rss };
    console.log(JSON.stringify(result, null, 2));
    if (Object.values(result).every(stage => stage.skipped || stage.fetched === 0)) {
      throw new Error("All ingestion providers failed, were skipped, or returned no articles.");
    }
    return result;
  }

  try {
    Object.assign(review, await runGroqReview());
  } catch (error) {
    review.skipped = true;
    review.error = error.message;
  }

  try {
    Object.assign(published, await runPublishApproved());
  } catch (error) {
    published.skipped = true;
    published.error = error.message;
  }

  const result = { gnews, gdelt, guardian, googleNewsRss, newsdata, rss, review, published };
  const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.from("stories").select("published_at")
    .order("published_at", { ascending: false, nullsFirst: false }).limit(1);
  const latestPublishedAt = data?.[0]?.published_at;
  const failures = getRefreshFailures(result, latestPublishedAt);
  if (error) failures.push(`Freshness check failed: ${error.message}`);
  const regions = [];
  for (const region of REGION_CONFIG) {
    const { data: stories, error: regionError } = await supabase.from("stories").select("published_at")
      .eq("region_code", region.code).order("published_at", { ascending: false, nullsFirst: false }).limit(1);
    const newest = stories?.[0]?.published_at || null;
    const stale = !newest || Date.now() - Date.parse(newest) > 72 * 60 * 60 * 1000;
    regions.push({ region: region.code, latestPublishedAt: newest, stale });
    if (regionError) failures.push(`Freshness check failed for ${region.code}: ${regionError.message}`);
    // Sparse editions can legitimately have no suitable stories; flag them for review, not automatic approval.
    if (stale && process.env.GITHUB_ACTIONS) console.warn(`::warning::No story dated within 72 hours for ${region.code}. Check source coverage and the review queue.`);
  }
  result.health = { latestPublishedAt, regions, failures };
  console.log(JSON.stringify(result, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## News refresh\n\nLatest story: ${latestPublishedAt || "unknown"}\n\nReviewed: ${review.reviewed || 0}; approved: ${review.approved || 0}; AI failures: ${review.aiFailures || 0}; published: ${published.published || 0}.\n\n${failures.length ? failures.join("\n\n") : "Review, publishing, and freshness checks passed."}\n`);
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n| Edition | Latest story (UTC) | Freshness |\n| --- | --- | --- |\n${regions.map(region => `| ${region.region} | ${region.latestPublishedAt || "none"} | ${region.stale ? "Check coverage: over 72 hours" : "Recent"} |`).join("\n")}\n`);
  }
  if (failures.length) throw new Error(failures.join(" "));
  return result;
};

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  run({ ingestOnly: process.argv.includes("--ingest-only") }).catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
