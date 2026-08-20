import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SEO_ROUTES, SITE_URL, GOOGLE_PLAY_URL } from "../src/brightnews/seoRoutes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const generatedAt = new Date().toISOString().slice(0, 10);
const ogImageUrl = `${SITE_URL}/brightnews-og.png`;

const escapeHtml = value => String(value || "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const routePriority = route => {
  if (route.path === "/positive-news") return "0.95";
  if (route.path === "/positive-news-today") return "0.9";
  if (
    route.path === "/good-news-today" ||
    route.path === "/positive-world-news" ||
    route.path === "/uplifting-news" ||
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
    lastmod: generatedAt,
  },
  ...SEO_ROUTES.map(route => ({
    loc: `${SITE_URL}${route.path}`,
    changefreq: routeChangefreq(route),
    priority: routePriority(route),
    lastmod: generatedAt,
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

const getFaqItems = route => ([
  {
    question: `What is ${route.heading}?`,
    answer: `${route.heading} is a BrightNews roundup focused on positive news, good news, uplifting stories and constructive current events from credible source-linked articles.`,
  },
  {
    question: "How does BrightNews choose positive news?",
    answer: "BrightNews gathers stories from public APIs, RSS feeds and selected source lists, removes duplicates, applies topic filters and uses AI-assisted review to reduce strongly negative, violent, tragic, political or outrage-driven stories.",
  },
  {
    question: "Does BrightNews replace mainstream news?",
    answer: "No. BrightNews is meant to add balance by making constructive and uplifting stories easier to find when mainstream feeds feel too negative.",
  },
]);

const renderSeoPage = route => {
  const canonicalUrl = `${SITE_URL}${route.path}`;
  const theme = getRouteTheme(route);
  const intro = getIntro(route);
  const relatedRoutes = getRelatedRoutes(route);
  const faqItems = getFaqItems(route);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "BrightNews",
      url: SITE_URL,
      logo: `${SITE_URL}/icons/icon-512.webp`,
      sameAs: [
        GOOGLE_PLAY_URL,
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "BrightNews",
      alternateName: "Positive News by BrightNews",
      url: SITE_URL,
      description: "Positive news, good news and uplifting stories from around the world.",
      publisher: {
        "@type": "Organization",
        name: "BrightNews",
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/icons/icon-512.webp`,
        },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: route.heading,
      headline: route.title,
      description: route.description,
      keywords: route.keywords,
      url: canonicalUrl,
      image: ogImageUrl,
      dateModified: generatedAt,
      isPartOf: {
        "@type": "WebSite",
        name: "BrightNews",
        url: SITE_URL,
      },
      about: route.keywords.split(",").map(keyword => keyword.trim()).filter(Boolean).slice(0, 8),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "BrightNews",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: route.heading,
          item: canonicalUrl,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map(item => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ];

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(route.title)}</title>
    <meta name="description" content="${escapeHtml(route.description)}" />
    <meta name="keywords" content="${escapeHtml(route.keywords)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="author" content="BrightNews" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="home" href="${escapeHtml(SITE_URL)}" />
    <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
    <meta property="og:title" content="${escapeHtml(route.title)}" />
    <meta property="og:description" content="${escapeHtml(route.description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:site_name" content="BrightNews" />
    <meta property="og:image" content="${escapeHtml(ogImageUrl)}" />
    <meta property="og:image:width" content="1024" />
    <meta property="og:image:height" content="500" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(route.title)}" />
    <meta name="twitter:description" content="${escapeHtml(route.description)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    <style>
      :root {
        color-scheme: light;
        --bn-bg: #f6f7f8;
        --bn-surface: #ffffff;
        --bn-surface-soft: #f1f3f4;
        --bn-border: #e3e6e8;
        --bn-border-strong: #cfd4d8;
        --bn-text-strong: #171a1d;
        --bn-text-muted: #60666c;
        --bn-text-subtle: #858b91;
        --bn-accent: #f5b800;
        --bn-accent-strong: #8a6500;
        --bn-accent-bg: #fff7d6;
        --bn-link: #0f5b97;
        --bn-radius: 8px;
      }
      * { box-sizing: border-box; }
      html { background: var(--bn-bg); }
      body {
        margin: 0;
        background: var(--bn-bg);
        color: var(--bn-text-strong);
        font-family: "Montserrat", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.6;
        letter-spacing: 0;
      }
      a { color: inherit; }
      .wrap { width: min(1180px, calc(100% - 48px)); margin: 0 auto; }
      .nav {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        align-items: center;
        min-height: 86px;
        border-bottom: 1px solid var(--bn-border);
      }
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        color: var(--bn-text-strong);
        font-size: 28px;
        font-weight: 800;
        text-decoration: none;
        line-height: 1;
      }
      .mark {
        width: 52px;
        height: 52px;
        border-radius: 8px;
        object-fit: cover;
        box-shadow: 0 1px 0 rgba(0, 0, 0, 0.06);
      }
      .nav-actions { display: flex; align-items: center; gap: 12px; }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 48px;
        padding: 0 18px;
        border: 1px solid var(--bn-border);
        border-radius: var(--bn-radius);
        background: var(--bn-surface);
        color: var(--bn-text-strong);
        text-decoration: none;
        font-size: 15px;
        font-weight: 800;
        white-space: nowrap;
      }
      .button--primary {
        border-color: var(--bn-accent);
        background: var(--bn-accent);
        color: #171a1d;
      }
      .hero {
        padding: 70px 0 34px;
      }
      .eyebrow {
        margin: 0 0 14px;
        color: var(--bn-text-subtle);
        font-size: 13px;
        font-weight: 800;
        letter-spacing: .18em;
        text-transform: uppercase;
      }
      .hero .eyebrow { color: var(--bn-accent-strong); }
      h1 {
        max-width: 920px;
        margin: 0;
        color: var(--bn-text-strong);
        font-size: clamp(44px, 6.8vw, 84px);
        font-weight: 800;
        line-height: 1.03;
        letter-spacing: 0;
      }
      .lead {
        max-width: 820px;
        margin: 22px 0 0;
        color: var(--bn-text-muted);
        font-size: clamp(18px, 2vw, 24px);
        font-weight: 500;
        line-height: 1.48;
      }
      .pill-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 26px;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        min-height: 38px;
        border: 1px solid var(--bn-border);
        border-radius: 999px;
        padding: 8px 13px;
        background: var(--bn-surface);
        color: var(--bn-text-muted);
        font-size: 14px;
        font-weight: 750;
      }
      .pill:first-child {
        border-color: var(--bn-accent);
        background: var(--bn-accent-bg);
        color: var(--bn-accent-strong);
      }
      .grid {
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(320px, .65fr);
        gap: 24px;
        padding: 24px 0 68px;
        align-items: start;
      }
      section,
      aside {
        border: 1px solid var(--bn-border);
        border-radius: var(--bn-radius);
        background: var(--bn-surface);
        padding: 30px;
      }
      section { max-width: 100%; }
      aside { position: sticky; top: 20px; }
      h2 {
        margin: 0 0 16px;
        color: var(--bn-text-strong);
        font-size: clamp(28px, 3vw, 40px);
        font-weight: 800;
        line-height: 1.12;
        letter-spacing: 0;
      }
      h3 {
        margin: 28px 0 10px;
        color: var(--bn-text-strong);
        font-size: 22px;
        font-weight: 800;
        line-height: 1.22;
      }
      p {
        margin: 0 0 16px;
        color: var(--bn-text-muted);
        font-size: 16px;
        font-weight: 500;
      }
      section > p:first-of-type { color: var(--bn-text-strong); }
      ul {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 10px;
      }
      li {
        position: relative;
        padding-left: 28px;
        color: var(--bn-text-muted);
        font-weight: 550;
      }
      li::before {
        content: "";
        position: absolute;
        left: 0;
        top: .58em;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--bn-accent);
        box-shadow: 0 0 0 5px var(--bn-accent-bg);
      }
      details {
        border-top: 1px solid var(--bn-border);
        padding: 16px 0;
      }
      details:last-of-type { border-bottom: 1px solid var(--bn-border); }
      summary {
        cursor: pointer;
        color: var(--bn-text-strong);
        font-weight: 800;
      }
      details p {
        margin: 10px 0 0;
        font-size: 15px;
      }
      .links {
        display: grid;
        gap: 10px;
      }
      .links a {
        display: block;
        padding: 16px;
        border: 1px solid var(--bn-border);
        border-radius: var(--bn-radius);
        background: var(--bn-surface);
        text-decoration: none;
        transition: border-color .2s ease, background .2s ease;
      }
      .links a:hover {
        border-color: var(--bn-border-strong);
        background: var(--bn-surface-soft);
      }
      .links strong {
        display: block;
        color: var(--bn-text-strong);
        font-size: 15px;
        font-weight: 800;
        line-height: 1.25;
      }
      .links span {
        display: block;
        margin-top: 6px;
        color: var(--bn-text-muted);
        font-size: 13px;
        font-weight: 500;
        line-height: 1.45;
      }
      .cta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 24px;
      }
      footer {
        border-top: 1px solid var(--bn-border);
        padding: 30px 0 46px;
      }
      footer p {
        max-width: 820px;
        color: var(--bn-text-subtle);
        font-size: 14px;
      }
      @media (max-width: 900px) {
        .wrap { width: min(100% - 36px, 720px); }
        .grid { grid-template-columns: 1fr; padding-bottom: 48px; }
        aside { position: static; }
      }
      @media (max-width: 620px) {
        .wrap { width: calc(100% - 32px); }
        .nav {
          min-height: 82px;
          gap: 12px;
        }
        .brand {
          gap: 10px;
          font-size: 25px;
        }
        .mark {
          width: 46px;
          height: 46px;
        }
        .button {
          min-height: 44px;
          padding: 0 13px;
          font-size: 13px;
        }
        .nav-actions .button:first-child { display: none; }
        .hero { padding: 48px 0 24px; }
        h1 { font-size: clamp(40px, 13vw, 56px); }
        .lead { font-size: 18px; }
        section,
        aside {
          padding: 22px;
        }
        h2 { font-size: 28px; }
      }
    </style>
  </head>
  <body>
    <header class="wrap">
      <nav class="nav" aria-label="BrightNews">
        <a class="brand" href="/"><img class="mark" src="/icons/icon-96.webp" alt="" width="52" height="52" /><span>BrightNews</span></a>
        <div class="nav-actions">
          <a class="button" href="/">Open web app</a>
          <a class="button button--primary" href="${escapeHtml(GOOGLE_PLAY_URL)}">Get Android app</a>
        </div>
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
        <h3>Frequently asked questions</h3>
        ${faqItems.map(item => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`).join("\n        ")}
        <p>Open the BrightNews web app for the full feed, saved stories, topic filters, country filters and the newest stories from around the world.</p>
        <div class="cta-row">
          <a class="button button--primary" href="/">Open BrightNews web app</a>
          <a class="button" href="${escapeHtml(GOOGLE_PLAY_URL)}">Get Android app</a>
        </div>
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
    `    <lastmod>${url.lastmod}</lastmod>`,
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
