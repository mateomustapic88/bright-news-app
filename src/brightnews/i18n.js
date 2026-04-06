import bs from "./locales/bs.json";
import de from "./locales/de.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import hr from "./locales/hr.json";
import ja from "./locales/ja.json";
import pt from "./locales/pt.json";
import sl from "./locales/sl.json";
import sr from "./locales/sr.json";

const UI_LOCALES = {
  en: "en-US",
  hr: "hr-HR",
  sl: "sl-SI",
  sr: "sr-RS",
  bs: "bs-BA",
  de: "de-DE",
  fr: "fr-FR",
  ja: "ja-JP",
  pt: "pt-BR",
};

const STRINGS = { en, hr, sl, sr, bs, de, fr, ja, pt };

const getNestedValue = (object, path) =>
  String(path || "")
    .split(".")
    .reduce((value, part) => (value && value[part] !== undefined ? value[part] : undefined), object);

const interpolate = (value, params = {}) =>
  String(value).replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));

export const getUiLanguage = languageId =>
  languageId && languageId !== "all" && STRINGS[languageId] ? languageId : "en";

export const formatUiDate = (date, languageId) =>
  new Intl.DateTimeFormat(UI_LOCALES[getUiLanguage(languageId)] || UI_LOCALES.en, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);

const formatUiShortDate = (date, languageId) => {
  const now = new Date();
  return new Intl.DateTimeFormat(UI_LOCALES[getUiLanguage(languageId)] || UI_LOCALES.en, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  }).format(date);
};

export const formatStoryPublishedAt = (publishedAt, languageId) => {
  if (!publishedAt) return "";

  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);
  const locale = UI_LOCALES[getUiLanguage(languageId)] || UI_LOCALES.en;
  const relativeFormatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absDiffMs < 60 * 1000) {
    return relativeFormatter.format(Math.round(diffMs / 1000), "second");
  }

  if (absDiffMs < 60 * 60 * 1000) {
    return relativeFormatter.format(Math.round(diffMs / (60 * 1000)), "minute");
  }

  if (absDiffMs < 24 * 60 * 60 * 1000) {
    return relativeFormatter.format(Math.round(diffMs / (60 * 60 * 1000)), "hour");
  }

  if (absDiffMs < 7 * 24 * 60 * 60 * 1000) {
    return relativeFormatter.format(Math.round(diffMs / (24 * 60 * 60 * 1000)), "day");
  }

  return formatUiShortDate(date, languageId);
};

export const createTranslator = languageId => {
  const uiLanguage = getUiLanguage(languageId);
  const languageStrings = STRINGS[uiLanguage] || STRINGS.en;

  return (key, params = {}) => {
    const translated = getNestedValue(languageStrings, key);
    const fallback = getNestedValue(STRINGS.en, key);
    return interpolate(translated ?? fallback ?? key, params);
  };
};

export const getTabLabel = (tabId, languageId) =>
  createTranslator(languageId)(`tabs.${tabId}`);

export const getCategoryLabel = (categoryId, languageId) =>
  createTranslator(languageId)(`categories.${categoryId}`);

export const getRegionLabel = (regionCode, languageId) =>
  createTranslator(languageId)(`regions.${regionCode}`);

export const getReviewFilterLabel = (filterId, languageId) =>
  createTranslator(languageId)(`reviewFilters.${filterId}`);

export const getLanguageLabel = (languageCode, languageId) =>
  createTranslator(languageId)(`languages.${languageCode}`);

export const getLanguageShortLabel = (languageCode, languageId) =>
  createTranslator(languageId)(`languageShort.${languageCode}`);
