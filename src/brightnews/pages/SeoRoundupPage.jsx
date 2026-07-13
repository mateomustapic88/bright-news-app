import { useEffect, useMemo, useState } from "react";
import { loadSeoStories } from "../api";
import { CATEGORIES, REGIONS, getCategoryMeta, getCategoryThemeClass } from "../constants";
import { formatStoryPublishedAt, getCategoryLabel } from "../i18n";
import { GOOGLE_PLAY_URL, SEO_ROUTES, SITE_URL } from "../seoRoutes";
import StoryMedia from "../components/StoryMedia";

const upsertMeta = (selector, attributes) => {
  if (typeof document === "undefined") return;

  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });
};

const upsertLink = (rel, href) => {
  if (typeof document === "undefined") return;

  let element = document.head.querySelector(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
};

const upsertJsonLd = data => {
  if (typeof document === "undefined") return;

  let element = document.head.querySelector("#brightnews-seo-jsonld");

  if (!element) {
    element = document.createElement("script");
    element.id = "brightnews-seo-jsonld";
    element.type = "application/ld+json";
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(data);
};

const groupStoriesByCategory = stories => CATEGORIES
  .filter(category => category.id !== "all")
  .map(category => ({
    ...category,
    stories: stories.filter(story => story.category === category.id).slice(0, 3),
  }))
  .filter(group => group.stories.length > 0);

const getRouteRegion = route => REGIONS.find(region => region.code === route.regionCode) || REGIONS[0];
const getRouteIntro = route => {
  if (Array.isArray(route.intro) && route.intro.length > 0) return route.intro;

  return [
    route.description,
    "Browse source-linked positive news, good news and uplifting stories without losing the original reporting behind each story.",
  ];
};

const SeoStoryCard = ({ story }) => {
  const category = getCategoryMeta(story.category);
  const publishedLabel = formatStoryPublishedAt(story.publishedAt, "en");

  return (
    <article className={`bn-seo-story ${getCategoryThemeClass(story.category)}`}>
      <StoryMedia
        story={story}
        className="bn-seo-story__media"
        imageClassName="bn-seo-story__image"
        fallbackClassName="bn-seo-story__emoji"
      />
      <div className="bn-seo-story__body">
        <div className="bn-seo-story__meta">
          <span>{category.emoji} {getCategoryLabel(story.category, "en")}</span>
          <span>{story.location}</span>
          {publishedLabel ? <span>{publishedLabel}</span> : null}
        </div>
        <h2>{story.headline}</h2>
        <p>{story.summary}</p>
        {story.sourceUrl ? (
          <a href={story.sourceUrl} target="_blank" rel="noreferrer noopener">
            Read the original story
          </a>
        ) : null}
      </div>
    </article>
  );
};

const SeoRoundupPage = ({ route }) => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const region = getRouteRegion(route);
  const canonicalUrl = `${SITE_URL}${route.path}`;
  const categoryGroups = useMemo(() => groupStoriesByCategory(stories), [stories]);
  const introParagraphs = getRouteIntro(route);

  useEffect(() => {
    document.title = route.title;
    upsertMeta('meta[name="description"]', { name: "description", content: route.description });
    upsertMeta('meta[name="keywords"]', { name: "keywords", content: route.keywords });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: route.title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: route.description });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: route.title });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: route.description });
    upsertLink("canonical", canonicalUrl);
    upsertJsonLd({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: route.heading,
      description: route.description,
      keywords: route.keywords,
      url: canonicalUrl,
      isPartOf: {
        "@type": "WebSite",
        name: "Positive News by BrightNews",
        url: SITE_URL,
      },
    });
  }, [canonicalUrl, route]);

  useEffect(() => {
    let active = true;

    const loadStories = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await loadSeoStories({
          regionCode: route.regionCode,
          categoryId: route.categoryId || "all",
          storyFilter: route.storyFilter,
          limit: 12,
        });

        if (active) setStories(result);
      } catch (loadError) {
        if (active) setError(loadError.message || "Unable to load this roundup right now.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadStories();

    return () => {
      active = false;
    };
  }, [route]);

  return (
    <main className="bn-seo-page">
      <header className="bn-seo-hero">
        <nav className="bn-seo-nav" aria-label="BrightNews">
          <a href="/" className="bn-seo-brand">
            <span aria-hidden="true">☀️</span>
            <strong>BrightNews</strong>
          </a>
          <a className="bn-seo-nav__app" href={GOOGLE_PLAY_URL} target="_blank" rel="noreferrer noopener">
            Get Android app
          </a>
        </nav>

        <div className="bn-seo-hero__content">
          <p className="bn-seo-eyebrow">{route.eyebrow}</p>
          <h1>{route.heading}</h1>
          <p>{route.description}</p>
          <div className="bn-seo-hero__intro">
            {introParagraphs.map(paragraph => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="bn-seo-hero__meta" aria-label="Roundup details">
            <span>{region.flag} {region.label}</span>
            <span>Constructive stories</span>
            <span>Source-linked summaries</span>
          </div>
        </div>
      </header>

      <section className="bn-seo-section" aria-labelledby="latest-positive-news">
        <div className="bn-seo-section__header">
          <p className="bn-seo-eyebrow">Latest roundup</p>
          <h2 id="latest-positive-news">Latest positive news and uplifting stories</h2>
        </div>

        {loading ? <p className="bn-seo-status">Loading the latest BrightNews stories...</p> : null}
        {error ? <p className="bn-seo-status bn-seo-status--error">{error}</p> : null}

        {!loading && !error ? (
          <div className="bn-seo-story-grid">
            {stories.map(story => (
              <SeoStoryCard key={story.id} story={story} />
            ))}
          </div>
        ) : null}
      </section>

      {categoryGroups.length > 0 ? (
        <section className="bn-seo-section" aria-labelledby="positive-news-topics">
          <div className="bn-seo-section__header">
            <p className="bn-seo-eyebrow">Topics</p>
            <h2 id="positive-news-topics">Good news by topic</h2>
          </div>
          <div className="bn-seo-topic-grid">
            {categoryGroups.map(group => (
              <article key={group.id} className={`bn-seo-topic ${getCategoryThemeClass(group.id)}`}>
                <h3>{group.emoji} {getCategoryLabel(group.id, "en")}</h3>
                <ul>
                  {group.stories.map(story => (
                    <li key={story.id}>{story.headline}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="bn-seo-section bn-seo-section--links" aria-labelledby="more-positive-news">
        <div className="bn-seo-section__header">
          <p className="bn-seo-eyebrow">Explore</p>
          <h2 id="more-positive-news">More positive news roundups</h2>
        </div>
        <div className="bn-seo-link-grid">
          {SEO_ROUTES.filter(item => item.path !== route.path).map(item => (
            <a key={item.path} href={item.path}>
              <span>{item.heading}</span>
              <small>{item.description}</small>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
};

export default SeoRoundupPage;
