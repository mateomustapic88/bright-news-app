import { writeFileSync } from "node:fs";
import { SEO_ROUTES, SITE_URL } from "../src/brightnews/seoRoutes.js";

const routePriority = route => {
  if (route.path === "/positive-news") return "0.95";
  if (route.path === "/positive-news-today") return "0.9";
  if (
    route.path === "/worldwide-positive-news" ||
    route.path === "/good-news-in-the-world" ||
    route.path === "/positive-current-events" ||
    route.path === "/good-news-only"
  ) return "0.9";
  if (route.path === "/good-news-this-week" || route.path === "/uplifting-stories" || route.path === "/positive-stories") return "0.85";
  return "0.8";
};

const routeChangefreq = route => (
  route.path === "/good-news-this-week" ? "weekly" : "daily"
);

const urls = [
  {
    loc: `${SITE_URL}/`,
    changefreq: "daily",
    priority: "1.0",
  },
  ...SEO_ROUTES.map(route => ({
    loc: `${SITE_URL}${route.path}`,
    changefreq: routeChangefreq(route),
    priority: routePriority(route),
  })),
];

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(url => [
    "  <url>",
    `    <loc>${url.loc}</loc>`,
    `    <changefreq>${url.changefreq}</changefreq>`,
    `    <priority>${url.priority}</priority>`,
    "  </url>",
  ].join("\n")),
  "</urlset>",
  "",
].join("\n");

writeFileSync(new URL("../public/sitemap.xml", import.meta.url), sitemap);
