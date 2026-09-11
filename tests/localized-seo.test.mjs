import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { LANGUAGE_META, getRequestedAppLanguage } from "../src/brightnews/constants.js";
import { LOCALIZED_SEO_PAGES, getLanguageAlternates } from "../src/brightnews/seoLanguages.js";
import { SEO_ROUTES, getSeoRoute, SITE_URL, GOOGLE_PLAY_URL } from "../src/brightnews/seoRoutes.js";
import { renderLocalizedSeoPage } from "../scripts/lib/localized-seo.mjs";

test("every supported app language has exactly one localized search hub", () => {
  const locales = readdirSync(new URL("../src/brightnews/locales/", import.meta.url)).map(file => file.replace(/\.json$/, "")).sort();
  assert.deepEqual(LOCALIZED_SEO_PAGES.map(page => page.locale).sort(), locales);
  assert.deepEqual(Object.keys(LANGUAGE_META).filter(key => key !== "all").sort(), locales);
  assert.equal(new Set(SEO_ROUTES.map(page => page.path)).size, SEO_ROUTES.length);
  for (const page of LOCALIZED_SEO_PAGES) {
    assert.equal(getSeoRoute(`${page.path}/`).locale, page.locale);
    assert.equal(page.topics.length, 4);
    assert.equal(page.faq.length, 3);
    for (const key of ["name", "heading", "description", "intro", "selection", "balance", "open", "android", "languages", "faqTitle", "footer"]) assert.ok(page[key], `${page.locale}.${key}`);
  }
});

test("localized HTML is complete without JavaScript and all alternates are reciprocal", () => {
  for (const page of LOCALIZED_SEO_PAGES) {
    const html = renderLocalizedSeoPage(page, SITE_URL, GOOGLE_PLAY_URL);
    assert.ok(html.includes(`<html lang="${page.locale}">`));
    assert.ok(html.includes(`<link rel="canonical" href="${SITE_URL}${page.path}" />`));
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    assert.ok(html.includes(page.heading));
    assert.ok(html.includes(`href="/?lang=${page.locale}"`));
    for (const alternate of getLanguageAlternates(SITE_URL)) {
      assert.ok(html.includes(`hreflang="${alternate.language}" href="${alternate.url}"`));
    }
    assert.equal((html.match(/<link rel="alternate"/g) || []).length, 10);
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(schema.inLanguage, page.locale);
    assert.equal(schema.url, `${SITE_URL}${page.path}`);
    assert.ok(!html.includes('src="/src/main'));
    assert.ok(!html.includes("dateModified"));
  }
});

test("localized rendering escapes text and JSON-LD", () => {
  const page = { ...LOCALIZED_SEO_PAGES[0], heading: '<img src=x onerror="alert(1)">', description: "</script><script>alert(1)</script>" };
  const html = renderLocalizedSeoPage(page, SITE_URL, GOOGLE_PLAY_URL);
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes("</script><script>"));
});

test("generated sitemap lists all language variants and their alternates", () => {
  const sitemap = readFileSync(new URL("../public/sitemap.xml", import.meta.url), "utf8");
  assert.ok(sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'));
  for (const page of LOCALIZED_SEO_PAGES) {
    const block = sitemap.split("<url>").find(item => item.includes(`<loc>${SITE_URL}${page.path}</loc>`));
    assert.ok(block, page.path);
    for (const alternate of getLanguageAlternates(SITE_URL)) assert.ok(block.includes(`hreflang="${alternate.language}" href="${alternate.url}"`));
    const html = readFileSync(new URL(`../public${page.path}/index.html`, import.meta.url), "utf8");
    assert.equal(html, renderLocalizedSeoPage(page, SITE_URL, GOOGLE_PLAY_URL));
  }
});

test("language entry links accept supported languages only", () => {
  for (const page of LOCALIZED_SEO_PAGES) assert.equal(getRequestedAppLanguage(`?lang=${page.locale}`), page.locale);
  for (const query of ["", "?lang=all", "?lang=unknown", "?lang=__proto__", "?lang=constructor", "?lang=%3Cscript%3E"]) assert.equal(getRequestedAppLanguage(query), null);
});

test("Vercel serves generated language pages before the SPA fallback", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const fallback = config.rewrites.findIndex(rule => rule.destination === "/");
  for (const page of LOCALIZED_SEO_PAGES) {
    const index = config.rewrites.findIndex(rule => rule.source === page.path);
    assert.ok(index >= 0 && index < fallback);
    assert.equal(config.rewrites[index].destination, `${page.path}/index.html`);
  }
});
