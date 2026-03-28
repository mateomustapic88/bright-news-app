import { pathToFileURL } from "node:url";
import { run as runGnewsIngest } from "./ingest-gnews.mjs";
import { run as runGdeltIngest } from "./ingest-gdelt.mjs";
import { run as runGoogleNewsRssIngest } from "./ingest-google-news-rss.mjs";
import { run as runNewsCatcherIngest } from "./ingest-newscatcher.mjs";
import { run as runRssIngest } from "./ingest-rss.mjs";
import { run as runOpenAiReview } from "./review-pending-with-openai.mjs";
import { run as runPublishApproved } from "./publish-approved-stories.mjs";

export const run = async () => {
  const gnews = { skipped: false };
  const gdelt = { skipped: false };
  const googleNewsRss = { skipped: false };
  const newscatcher = { skipped: false };
  const rss = { skipped: false };
  const openai = { skipped: false };

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
    Object.assign(googleNewsRss, await runGoogleNewsRssIngest());
  } catch (error) {
    googleNewsRss.skipped = true;
    googleNewsRss.error = error.message;
  }

  try {
    Object.assign(newscatcher, await runNewsCatcherIngest());
  } catch (error) {
    newscatcher.skipped = true;
    newscatcher.error = error.message;
  }

  try {
    Object.assign(rss, await runRssIngest());
  } catch (error) {
    rss.skipped = true;
    rss.error = error.message;
  }

  try {
    Object.assign(openai, await runOpenAiReview());
  } catch (error) {
    openai.skipped = true;
    openai.error = error.message;
  }

  const published = await runPublishApproved();

  const result = { gnews, gdelt, googleNewsRss, newscatcher, rss, openai, published };
  console.log(JSON.stringify(result, null, 2));
  return result;
};

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  run().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
