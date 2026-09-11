# Localized Search Pages

BrightNews has one indexable worldwide news guide for each UI language:

| Language | Path |
| --- | --- |
| English | `/positive-news` |
| Croatian | `/pozitivne-vijesti` |
| Serbian | `/pozitivne-vesti` |
| Bosnian | `/bs/pozitivne-vijesti` |
| Slovenian | `/pozitivne-novice` |
| German | `/positive-nachrichten` |
| French | `/bonnes-nouvelles` |
| Portuguese | `/noticias-positivas` |
| Japanese | `/ja/positive-news` |

These are language variants of the same worldwide guide, not different country feeds. Existing English country and topic URLs remain available. Each guide explains the topics, source attribution, filtering and limitations in the reader's language. It links into the live app; it does not invent or automatically translate news articles.

`seoLanguages.js` holds search-specific editorial copy. `LocalizedSeoContent.js` is shared by the build-time HTML generator and the React route fallback. Tests compare coverage with the actual locale files and `LANGUAGE_META` so a newly supported app language cannot silently miss an SEO page.

Every guide has a self-canonical URL, translated title and description, HTML language, social metadata, and reciprocal `hreflang` links including itself. English is `x-default`. The sitemap carries the same language associations. Do not canonicalize these translations to the English page.

The generator writes complete readable HTML to `public/`; JavaScript is not required. Local font files are copied from the app's installed Montserrat package during generation. Language links are visible on the guides, existing static SEO pages, and the homepage. Entry buttons use `/?lang=xx`; the app validates the language and applies it ahead of saved preferences. The homepage retains its root canonical for these query variants.

## Deploy and Check

Explicit Vercel rewrites serve each language hub's generated HTML before the SPA fallback. Vite preview mirrors these rewrites for local checks. Keep the rewrite coverage test passing when adding a language. See [Vercel rewrite documentation](https://vercel.com/docs/routing/rewrites).

Run `npm run build`, `npm run lint`, and `node --test tests/localized-seo.test.mjs tests/homepage-seo.test.mjs`. Deploy the web build to Vercel. Check a localized URL without JavaScript and inspect its source for the translated heading and canonical. Confirm the sitemap returns XML and each URL returns the intended static page with HTTP 200.

In Google Search Console, resubmit `https://brightnews.app/sitemap.xml` and request indexing for the new language hubs. Monitor impressions by query and page, including `pozitivne vijesti` and `pozitivne vesti`. Indexing and ranking are Google's decisions; these changes do not guarantee a ranking or immediate traffic. Native-speaker review of editorial translations is recommended.

No Android store update is required for Google to discover these web pages. An Android rebuild would only be needed to distribute the related app navigation changes in the bundled native app.
