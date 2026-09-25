import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";

export async function cleanupRejectedArticles(client, now = Date.now()) {
  const cutoff = new Date(now - 14 * 86400000).toISOString();
  let deleted = 0;
  for (let batch = 0; batch < 80; batch++) {
    const { data, error } = await client.from("raw_articles").select("id")
      .eq("review_status", "rejected").is("published_story_id", null)
      .lt("created_at", cutoff).order("created_at").limit(250);
    if (error) throw new Error(error.message);
    if (!data.length) return { deleted, cutoff, capped: false };
    // Recheck eligibility: review or publication may change after the SELECT.
    const result = await client.from("raw_articles").delete().in("id", data.map(row => row.id))
      .eq("review_status", "rejected").is("published_story_id", null)
      .lt("created_at", cutoff).select("id");
    if (result.error) throw new Error(result.error.message);
    deleted += result.data.length;
  }
  return { deleted, cutoff, capped: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing Supabase server credentials.");
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(30000) }) },
    });
    console.log(JSON.stringify(await cleanupRejectedArticles(client)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
