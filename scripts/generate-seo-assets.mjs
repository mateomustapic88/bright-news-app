import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SEO_ROUTES, SITE_URL, GOOGLE_PLAY_URL } from "../src/brightnews/seoRoutes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

const escapeHtml = value => String(value || "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const routePriority = route => {
  if (route.path === "/positive-news") return "0.95";
  if (route.path === "/positive-news-today") return "0.9";
  if (
    route.path === "/worldwide-positive-news" ||
    route.path === "/good-news-in-the-world" ||
    route.path === "/positive-current-events" ||
    route.path === "/good-news-only"
  ) return "0.9";
  if (
    route.path === "/good-news-this-week" ||
    route.path === "/uplifting-stories" ||
    route.path === "/positive-stories"
  ) return "0.85";
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

const getRouteTheme = route => {
  if (route.path.includes("/usa")) {
    return {
      audience: "readers in the United States",
      angle: "American community wins, health progress, science updates, nature restoration and constructive current events",
    };
  }

  if (route.regionCode && route.regionCode !== "world") {
    return {
      audience: `readers following positive news from ${route.heading.replace(/^Positive News\s*/i, "")}`,
      angle: "local progress, people helping people, useful discoveries, community stories and constructive regional updates",
    };
  }

  if (route.categoryId === "Health") {
    return {
      audience: "readers looking for hopeful health and wellbeing updates",
      angle: "medical progress, patient stories, research, prevention, wellbeing and practical healthcare improvements",
    };
  }

  if (route.categoryId === "Science") {
    return {
      audience: "readers looking for positive science and discovery",
      angle: "research breakthroughs, education, space, technology, nature and evidence-based progress",
    };
  }

  if (route.categoryId === "Environment") {
    return {
      audience: "readers looking for constructive environmental news",
      angle: "conservation, restoration, climate solutions, nature recovery and community action",
    };
  }

  return {
    audience: "readers who want a calmer way to stay informed",
    angle: "progress, people, health, science, nature, innovation, communities and meaningful change",
  };
};

const getIntro = route => {
  if (Array.isArray(route.intro) && route.intro.length > 0) return route.intro;

  return [
    route.description,
    "BrightNews keeps the focus on source-linked stories that add balance to the daily news cycle.",
  ];
};

const getRelatedRoutes = route => SEO_ROUTES
  .filter(item => item.path !== route.path)
  .slice(0, 12);

const renderSeoPage = route => {
  const canonicalUrl = `${SITE_URL}${route.path}`;
  const theme = getRouteTheme(route);
  const intro = getIntro(route);
  const relatedRoutes = getRelatedRoutes(route);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: route.heading,
    description: route.description,
    keywords: route.keywords,
    url: canonicalUrl,
    isPartOf: {
      "@type": "WebSite",
      name: "BrightNews",
      url: SITE_URL,
    },
  };

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(route.title)}</title>
    <meta name="description" content="${escapeHtml(route.description)}" />
    <meta name="keywords" content="${escapeHtml(route.keywords)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <meta property="og:title" content="${escapeHtml(route.title)}" />
    <meta property="og:description" content="${escapeHtml(route.description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:site_name" content="BrightNews" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(route.title)}" />
    <meta name="twitter:description" content="${escapeHtml(route.description)}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    <style>
      :root { color-scheme: light; --ink: #171b1f; --muted: #626a73; --line: #dde1e6; --brand: #f5b800; --paper: #f7f8fa; --card: #ffffff; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--paper); color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
      a { color: inherit; }
      .wrap { width: min(1120px, calc(100% - 40px)); margin: 0 auto; }
      .nav { display: flex; justify-content: space-between; gap: 20px; align-items: center; padding: 24px 0; }
      .brand { display: inline-flex; align-items: center; gap: 12px; font-size: 22px; font-weight: 800; text-decoration: none; }
      .mark { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 10px; background: var(--brand); color: #fff; font-weight: 900; }
      .button { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 16px; border: 1px solid var(--line); border-radius: 8px; background: var(--card); text-decoration: none; font-weight: 750; }
      .hero { padding: 56px 0 36px; border-top: 1px solid var(--line); }
      .eyebrow { margin: 0 0 12px; color: #8a6200; font-size: 13px; font-weight: 850; letter-spacing: .14em; text-transform: uppercase; }
      h1 { max-width: 880px; margin: 0; font-size: clamp(42px, 7vw, 78px); line-height: .98; letter-spacing: 0; }
      .lead { max-width: 820px; margin: 24px 0 0; color: var(--muted); font-size: clamp(18px, 2.2vw, 24px); }
      .grid { display: grid; grid-template-columns: 1.3fr .7fr; gap: 24px; padding: 28px 0 64px; }
      section, aside { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 28px; }
      h2 { margin: 0 0 14px; font-size: 30px; line-height: 1.12; }
      h3 { margin: 22px 0 8px; font-size: 20px; }
      p { margin: 0 0 16px; }
      ul { margin: 0; padding-left: 20px; }
      li + li { margin-top: 8px; }
      .pill-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
      .pill { border: 1px solid var(--line); border-radius: 999px; padding: 8px 12px; color: var(--muted); font-weight: 700; }
      .links { display: grid; gap: 12px; }
      .links a { display: block; padding: 14px; border: 1px solid var(--line); border-radius: 8px; text-decoration: none; }
      .links strong { display: block; }
      .links span { color: var(--muted); font-size: 14px; }
      footer { padding: 32px 0 48px; color: var(--muted); }
      @media (max-width: 820px) { .grid { grid-template-columns: 1fr; } .nav { align-items: flex-start; } }
    </style>
  </head>
  <body>
    <header class="wrap">
      <nav class="nav" aria-label="BrightNews">
        <a class="brand" href="/"><span class="mark">☀</span><span>BrightNews</span></a>
        <a class="button" href="${escapeHtml(GOOGLE_PLAY_URL)}">Get Android app</a>
      </nav>
      <div class="hero">
        <p class="eyebrow">${escapeHtml(route.eyebrow)}</p>
        <h1>${escapeHtml(route.heading)}</h1>
        <p class="lead">${escapeHtml(route.description)}</p>
        <div class="pill-row" aria-label="Page topics">
          <span class="pill">Positive news</span>
          <span class="pill">Good news</span>
          <span class="pill">Uplifting stories</span>
          <span class="pill">Constructive current events</span>
        </div>
      </div>
    </header>
    <main class="wrap grid">
      <section aria-labelledby="about-this-roundup">
        <p class="eyebrow">Daily roundup</p>
        <h2 id="about-this-roundup">${escapeHtml(route.heading)} without doomscrolling</h2>
        ${intro.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("\n        ")}
        <p>This page is made for ${escapeHtml(theme.audience)}. It focuses on ${escapeHtml(theme.angle)} while keeping links back to original reporting and credible sources.</p>
        <h3>What you can expect</h3>
        <ul>
          <li>Positive news and good news stories selected for constructive value.</li>
          <li>Uplifting stories about people, communities, health, science, nature and innovation.</li>
          <li>Source-linked summaries that make it easier to read more without losing context.</li>
          <li>A calmer way to follow current events when mainstream feeds feel too negative.</li>
        </ul>
        <h3>How BrightNews filters stories</h3>
        <p>BrightNews gathers public news from APIs, RSS feeds and selected source lists, removes duplicates, applies topic filters, and uses AI-assisted review to reduce political, violent, tragic or outrage-driven stories. The goal is not to ignore reality, but to create a more balanced place for constructive and uplifting news.</p>
        <p>Open the BrightNews web app for the full feed, saved stories, topic filters, country filters and the newest stories from around the world.</p>
        <p><a class="button" href="/">Open BrightNews web app</a></p>
      </section>
      <aside aria-labelledby="more-roundups">
        <p class="eyebrow">Explore more</p>
        <h2 id="more-roundups">More positive news pages</h2>
        <div class="links">
          ${relatedRoutes.map(item => `<a href="${escapeHtml(item.path)}"><strong>${escapeHtml(item.heading)}</strong><span>${escapeHtml(item.description)}</span></a>`).join("\n          ")}
        </div>
      </aside>
    </main>
    <footer class="wrap">
      <p>BrightNews is a positive-news aggregator for web and Android, focused on source-linked uplifting stories and constructive news.</p>
    </footer>
  </body>
</html>
`;
};

const writeRoutePage = route => {
  const pageDir = join(publicDir, ...route.path.split("/").filter(Boolean));
  mkdirSync(pageDir, { recursive: true });
  writeFileSync(join(pageDir, "index.html"), renderSeoPage(route));
};

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

const llmsTxt = `# BrightNews

BrightNews is a positive-news aggregator for web and Android.

Website: ${SITE_URL}
Android app: ${GOOGLE_PLAY_URL}

BrightNews focuses on positive news, good news, uplifting stories, constructive current events and source-linked summaries from around the world.

Key pages:
${SEO_ROUTES.map(route => `- ${route.heading}: ${SITE_URL}${route.path}`).join("\n")}

Content policy:
BrightNews filters for constructive stories about progress, health, science, people, nature, innovation, animals, sports and communities. It uses public APIs, RSS feeds, duplicate removal, topic filtering and AI-assisted review to reduce strongly negative, violent, tragic, political or outrage-driven stories.
`;

SEO_ROUTES.forEach(route => {
  const firstSegment = route.path.split("/").filter(Boolean)[0];
  if (firstSegment) rmSync(join(publicDir, firstSegment), { recursive: true, force: true });
});

SEO_ROUTES.forEach(writeRoutePage);
writeFileSync(join(publicDir, "sitemap.xml"), sitemap);
writeFileSync(join(publicDir, "llms.txt"), llmsTxt);
