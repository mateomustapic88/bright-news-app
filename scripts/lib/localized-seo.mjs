import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import LocalizedSeoContent from "../../src/brightnews/components/LocalizedSeoContent.js";
import { getLanguageAlternates, getLocalizedPageSchema } from "../../src/brightnews/seoLanguages.js";

const escape = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export const renderLocalizedSeoPage = (page, siteUrl, googlePlayUrl) => {
  const canonical = `${siteUrl}${page.path}`;
  const schema = getLocalizedPageSchema(page, siteUrl);
  return `<!doctype html>
<html lang="${escape(page.locale)}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(page.title)}</title>
<meta name="description" content="${escape(page.description)}" />
<link rel="canonical" href="${escape(canonical)}" />
${getLanguageAlternates(siteUrl).map(item => `<link rel="alternate" hreflang="${item.language}" href="${escape(item.url)}" />`).join("\n")}
<meta property="og:type" content="website" />
<meta property="og:site_name" content="BrightNews" />
<meta property="og:title" content="${escape(page.title)}" />
<meta property="og:description" content="${escape(page.description)}" />
<meta property="og:url" content="${escape(canonical)}" />
<meta property="og:image" content="${escape(siteUrl)}/brightnews-og.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escape(page.title)}" />
<meta name="twitter:description" content="${escape(page.description)}" />
<meta name="twitter:image" content="${escape(siteUrl)}/brightnews-og.png" />
<link rel="icon" href="/icons/icon-96.webp" />
<link rel="stylesheet" href="/localized-news.css" />
<link rel="stylesheet" href="/fonts/seo/fonts.css" />
<style>body{margin:0}</style>
<script type="application/ld+json">${JSON.stringify(schema).replaceAll("<", "\\u003c")}</script>
</head>
<body>${renderToStaticMarkup(createElement(LocalizedSeoContent, { page, googlePlayUrl }))}</body>
</html>\n`;
};
