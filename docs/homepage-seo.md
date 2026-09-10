# Homepage search visibility

- The homepage uses a branded title, self-canonical URL, and Bright News/BrightNews app site-name aliases.
- The Vite production build embeds a public, anonymous snapshot of up to six recent stories in the root HTML. React replaces this with the live application when it starts. No bot-specific rendering or privileged database key is used.
- Snapshots are build-time prerendering, not request-time SSR. A deployment refreshes the snapshot; successful ingestion alone does not. Article publication dates remain visible. The running app still fetches live data normally.
- Missing public Supabase configuration or a failed snapshot request retains descriptive brand content and links without fabricating articles. Build logs report request failures.
- The www host permanently redirects to brightnews.app while preserving the path. Verify domain settings in Vercel do not also redirect in the opposite direction.
- Existing indexed SEO routes are retained. No blanket canonical consolidation or deletion is justified by the small Search Console sample.
- Generated sitemap entries and structured data no longer claim every page changed on each build. Last-modified timestamps are omitted until reliable page-content modification times are available.

After deployment, inspect the homepage's live HTML and run Search Console's live URL test, then request indexing once. Check the separate Sitemaps report for successful processing. Changes cannot guarantee a particular Google ranking.

Validation: `node --test tests/homepage-seo.test.mjs`, `npm run build`, and browser checks with JavaScript enabled/disabled on desktop and mobile.
