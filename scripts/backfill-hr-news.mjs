import { pathToFileURL } from "node:url";
import { run as runNewsDataIngest } from "./ingest-newsdata.mjs";
import { run as runOpenAiReview } from "./review-pending-with-openai.mjs";
import { run as runPublishApproved } from "./publish-approved-stories.mjs";

process.env.INGEST_REGION_CODES = process.env.INGEST_REGION_CODES || "hr";
process.env.INGEST_NEWSDATA_PAGES = process.env.INGEST_NEWSDATA_PAGES || "8";
process.env.INGEST_NEWSDATA_QUERY_MODE = process.env.INGEST_NEWSDATA_QUERY_MODE || "broad";

export const run = async () => {
  const ingest = await runNewsDataIngest();

  let review = { skipped: true, reason: "OPENAI_API_KEY is missing." };
  if (process.env.OPENAI_API_KEY) {
    review = await runOpenAiReview();
  }

  const published = await runPublishApproved();
  const result = { ingest, review, published };
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
