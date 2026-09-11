import { LOCALIZED_SEO_PAGES } from "../../src/brightnews/seoLanguages.js";

export const HOME_TITLE = "BrightNews | Positive News & Good News Today";
export const HOME_DESCRIPTION = "Discover positive news with BrightNews: source-linked stories about science, health, communities and the planet. Read on the web or get the Android app.";

const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const safeUrl = value => {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
};

export const selectHomepageStories = (rows, now = Date.now()) => {
  const seen = new Set();
  return rows.filter(row => {
    const date = Date.parse(row.published_at);
    const url = safeUrl(row.source_url);
    if (!row.headline || !row.summary || !url || seen.has(url) || !Number.isFinite(date) || date > now || date < now - 7 * 86400000) return false;
    seen.add(url);
    return true;
  }).slice(0, 6);
};

export const loadHomepageStories = async (env, fetcher = fetch) => {
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) return [];
  const url = new URL("/rest/v1/stories", env.VITE_SUPABASE_URL);
  url.search = new URLSearchParams({
    select: "headline,summary,source_url,image_url,location,published_at",
    order: "published_at.desc.nullslast",
    published_at: `lte.${new Date().toISOString()}`,
    limit: "30",
  });
  const response = await fetcher(url, {
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Homepage story snapshot request failed (${response.status}).`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("Invalid homepage story snapshot response.");
  return selectHomepageStories(rows);
};

export const renderHomepageSnapshot = stories => `
<style>
#bn-home-snapshot{color:#191d20;background:#f6f7f8;font:16px/1.6 Montserrat,Arial,sans-serif;min-height:100vh;letter-spacing:0}
#bn-home-snapshot *{box-sizing:border-box}#bn-home-snapshot a{color:inherit;text-underline-offset:4px}
#bn-home-snapshot header{background:#fff;border-bottom:1px solid #e1e4e7;padding:20px 24px;display:flex;align-items:center;gap:14px;font-size:24px;font-weight:800}
#bn-home-snapshot header img{width:40px;height:40px}#bn-home-snapshot main{max-width:1120px;margin:auto;padding:32px 24px}
#bn-home-snapshot h1{font-size:32px;line-height:1.2;margin:0 0 18px}#bn-home-snapshot h2{font-size:22px;line-height:1.3}#bn-home-snapshot h3{font-size:18px;line-height:1.4}
#bn-home-snapshot nav{display:flex;flex-wrap:wrap;gap:12px 24px;margin:24px 0}#bn-home-snapshot .stories{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
#bn-home-snapshot article{min-width:0;padding-bottom:24px;border-bottom:1px solid #dce0e4;overflow-wrap:anywhere}#bn-home-snapshot article img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:6px}
#bn-home-snapshot .meta{color:#626970;font-size:13px}#bn-home-snapshot footer{margin-top:32px;border-top:1px solid #dce0e4;padding-top:20px}
@media(max-width:600px){#bn-home-snapshot .stories{grid-template-columns:1fr}#bn-home-snapshot h1{font-size:28px}}
@media(prefers-color-scheme:dark){#bn-home-snapshot{background:#111416;color:#f3f4f5}#bn-home-snapshot header{background:#191d20;border-color:#343a40}#bn-home-snapshot .meta{color:#bac0c6}}
</style>
<div id="bn-home-snapshot">
  <header><img src="/icons/icon-192.webp" alt="" width="40" height="40" /><a href="/">BrightNews</a></header>
  <main>
    <h1>BrightNews: positive news from around the world</h1>
    <p>Discover stories of progress in science, health, communities and the planet. BrightNews brings together positive news from multiple publishers, with short summaries and links to the original reporting.</p>
    <nav aria-label="Explore positive news"><a href="/good-news-this-week">This week's good news</a><a href="/positive-news/usa">USA</a><a href="/positive-news/uk">UK</a><a href="/good-news-about-the-environment">Environment</a></nav>
    ${stories.length ? `<section aria-labelledby="bn-snapshot-stories"><h2 id="bn-snapshot-stories">Recent positive stories</h2><div class="stories">${stories.map(story => `<article>
      ${safeUrl(story.image_url) ? `<img src="${escapeHtml(safeUrl(story.image_url))}" alt="" width="640" height="360" loading="lazy" />` : ""}
      <p class="meta">${escapeHtml(story.location)} · <time datetime="${escapeHtml(story.published_at)}">${escapeHtml(story.published_at.slice(0, 10))}</time></p>
      <h3>${escapeHtml(story.headline)}</h3><p>${escapeHtml(story.summary)}</p>
      <a href="${escapeHtml(safeUrl(story.source_url))}" rel="noopener noreferrer">Read the original story</a>
    </article>`).join("\n")}</div></section>` : ""}
    <footer><h2>How BrightNews selects stories</h2><p>We collect articles from RSS feeds and news APIs, remove duplicates, and use topic filters and AI-assisted review to select constructive stories. Summaries are a starting point: follow the source for the full context.</p>
    <p>BrightNews is an independent news aggregator, not the original publisher. Our aim is to add balance to your news reading, not to replace wider reporting.</p>
    <a href="https://play.google.com/store/apps/details?id=com.mateomustapic.brightnews">BrightNews for Android</a>
    <nav aria-label="Languages">${LOCALIZED_SEO_PAGES.map(page => `<a href="${page.path}" hreflang="${page.locale}" lang="${page.locale}">${page.name}</a>`).join(" ")}</nav></footer>
  </main>
</div>`;
