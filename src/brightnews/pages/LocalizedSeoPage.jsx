import { useEffect } from "react";
import LocalizedSeoContent from "../components/LocalizedSeoContent.js";
import { getLanguageAlternates, getLocalizedPageSchema } from "../seoLanguages.js";
import { GOOGLE_PLAY_URL, SITE_URL } from "../seoRoutes.js";

export default function LocalizedSeoPage({ page }) {
  useEffect(() => {
    const previousLanguage = document.documentElement.lang;
    const previousTitle = document.title;
    document.documentElement.lang = page.locale;
    document.title = page.title;
    const restoreMeta = [
      ['name', 'description', page.description],
      ['property', 'og:title', page.title],
      ['property', 'og:description', page.description],
      ['property', 'og:url', `${SITE_URL}${page.path}`],
      ['name', 'twitter:title', page.title],
      ['name', 'twitter:description', page.description],
    ].map(([attribute, key, value]) => {
      const existing = document.querySelector(`meta[${attribute}="${key}"]`);
      const meta = existing || document.createElement("meta");
      const previous = meta.content;
      meta.setAttribute(attribute, key);
      meta.content = value;
      if (!existing) document.head.append(meta);
      return () => { if (existing) meta.content = previous; else meta.remove(); };
    });
    const canonical = document.querySelector('link[rel="canonical"]');
    const previousCanonical = canonical?.href;
    if (canonical) canonical.href = `${SITE_URL}${page.path}`;
    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.textContent = JSON.stringify(getLocalizedPageSchema(page, SITE_URL));
    document.head.append(schema);
    const alternates = getLanguageAlternates(SITE_URL).map(alternate => {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = alternate.language;
      link.href = alternate.url;
      document.head.append(link);
      return link;
    });
    return () => {
      document.documentElement.lang = previousLanguage;
      document.title = previousTitle;
      restoreMeta.forEach(restore => restore());
      if (canonical) canonical.href = previousCanonical;
      schema.remove();
      alternates.forEach(link => link.remove());
    };
  }, [page]);
  return <><link rel="stylesheet" href="/localized-news.css" /><LocalizedSeoContent page={page} googlePlayUrl={GOOGLE_PLAY_URL} /></>;
}
