import { createElement as h } from "react";
import { LOCALIZED_SEO_PAGES } from "../seoLanguages.js";

// Shared by the static HTML generator and React so crawlers and readers see the same copy.
export default function LocalizedSeoContent({ page, googlePlayUrl }) {
  const appUrl = `/?lang=${page.locale}`;
  return h("div", { className: "bn-localized-news", lang: page.locale },
    h("header", null, h("nav", { className: "bn-ln-wrap", "aria-label": "BrightNews" },
      h("a", { className: "bn-ln-brand", href: appUrl },
        h("img", { src: "/icons/icon-96.webp", width: 40, height: 40, alt: "" }), "BrightNews"),
      h("a", { className: "bn-ln-button", href: appUrl }, page.open))),
    h("main", { className: "bn-ln-wrap" },
      h("h1", null, page.heading),
      h("p", { className: "bn-ln-lead" }, page.description),
      h("p", null, page.intro),
      h("section", { "aria-labelledby": "bn-ln-topics" },
        h("h2", { id: "bn-ln-topics" }, page.topicsTitle),
        h("ul", null, ...page.topics.map(topic => h("li", { key: topic }, topic)))),
      h("section", { "aria-labelledby": "bn-ln-selection" },
        h("h2", { id: "bn-ln-selection" }, page.selectionTitle),
        h("p", null, page.selection), h("p", null, page.balance)),
      h("section", { "aria-labelledby": "bn-ln-faq" },
        h("h2", { id: "bn-ln-faq" }, page.faqTitle),
        ...page.faq.map(([question, answer]) => h("details", { key: question },
          h("summary", null, question), h("p", null, answer)))),
      h("div", { className: "bn-ln-actions" },
        h("a", { className: "bn-ln-button bn-ln-primary", href: appUrl }, page.open),
        h("a", { className: "bn-ln-button", href: googlePlayUrl }, page.android)),
      h("nav", { className: "bn-ln-languages", "aria-label": page.languages },
        h("h2", null, page.languages),
        h("div", null, ...LOCALIZED_SEO_PAGES.map(language => h("a", {
          key: language.locale, href: language.path, hrefLang: language.locale, lang: language.locale,
          "aria-current": language.locale === page.locale ? "page" : undefined,
        }, language.name))))),
    h("footer", { className: "bn-ln-wrap" }, page.footer));
}
