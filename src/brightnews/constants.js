export const REGIONS = [
  { code: "world", flag: "🌍", label: "World" },
  { code: "us", flag: "🇺🇸", label: "USA" },
  { code: "uk", flag: "🇬🇧", label: "UK" },
  { code: "hr", flag: "🇭🇷", label: "Croatia" },
  { code: "si", flag: "🇸🇮", label: "Slovenia" },
  { code: "rs", flag: "🇷🇸", label: "Serbia" },
  { code: "ba", flag: "🇧🇦", label: "Bosnia & Herzegovina" },
  { code: "de", flag: "🇩🇪", label: "Germany" },
  { code: "fr", flag: "🇫🇷", label: "France" },
  { code: "ca", flag: "🇨🇦", label: "Canada" },
  { code: "jp", flag: "🇯🇵", label: "Japan" },
  { code: "my", flag: "🇲🇾", label: "Malaysia" },
  { code: "au", flag: "🇦🇺", label: "Australia" },
  { code: "br", flag: "🇧🇷", label: "Brazil" },
  { code: "in", flag: "🇮🇳", label: "India" },
];

export const REGION_CONTINENTS = [
  { id: "north_america", label: "North America", emoji: "🌎", regionCodes: ["us", "ca"] },
  { id: "europe", label: "Europe", emoji: "🌍", regionCodes: ["uk", "hr", "si", "rs", "ba", "de", "fr"] },
  { id: "asia", label: "Asia", emoji: "🌏", regionCodes: ["jp", "in", "my"] },
  { id: "oceania", label: "Oceania", emoji: "🌊", regionCodes: ["au"] },
  { id: "south_america", label: "South America", emoji: "🌎", regionCodes: ["br"] },
];

export const LANGUAGE_META = {
  all: { id: "all", label: "All languages", shortLabel: "All", emoji: "🌐" },
  en: { id: "en", label: "English", shortLabel: "English", emoji: "🇬🇧" },
  hr: { id: "hr", label: "Croatian", shortLabel: "Croatian", emoji: "🇭🇷" },
  sl: { id: "sl", label: "Slovenian", shortLabel: "Slovenian", emoji: "🇸🇮" },
  sr: { id: "sr", label: "Serbian", shortLabel: "Serbian", emoji: "🇷🇸" },
  bs: { id: "bs", label: "Bosnian", shortLabel: "Bosnian", emoji: "🇧🇦" },
  de: { id: "de", label: "German", shortLabel: "German", emoji: "🇩🇪" },
  fr: { id: "fr", label: "French", shortLabel: "French", emoji: "🇫🇷" },
  ja: { id: "ja", label: "Japanese", shortLabel: "Japanese", emoji: "🇯🇵" },
  pt: { id: "pt", label: "Portuguese", shortLabel: "Portuguese", emoji: "🇧🇷" },
};

export const REGION_LANGUAGE_BY_CODE = {
  world: "en",
  us: "en",
  uk: "en",
  hr: "hr",
  si: "sl",
  rs: "sr",
  ba: "bs",
  de: "de",
  fr: "fr",
  ca: "en",
  jp: "ja",
  my: "en",
  au: "en",
  br: "pt",
  in: "en",
};

export const CATEGORIES = [
  { id: "all", label: "All", emoji: "✨", icon: "sparkles", theme: "all" },
  { id: "Environment", label: "Planet", emoji: "🌿", icon: "leaf", theme: "environment" },
  { id: "Science", label: "Science", emoji: "🔬", icon: "microscope", theme: "science" },
  { id: "Community", label: "People", emoji: "🤝", icon: "handshake", theme: "community" },
  { id: "Health", label: "Health", emoji: "💚", icon: "health", theme: "health" },
  { id: "Animals", label: "Animals", emoji: "🐾", icon: "paw", theme: "animals" },
  { id: "Sports", label: "Sports", emoji: "🏅", icon: "trophy", theme: "sports" },
  { id: "Innovation", label: "Tech", emoji: "💡", icon: "lightbulb", theme: "innovation" },
];

export const TABS = [
  { id: "home", emoji: "🏠", label: "Home" },
  { id: "discover", emoji: "🌍", label: "Discover" },
  { id: "saved", emoji: "❤️", label: "Saved" },
  { id: "account", emoji: "👤", label: "Account" },
];

export const REVIEW_FILTERS = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

export const STORY_FILTERS = [
  { id: "newest", label: "Newest", emoji: "🕒" },
  { id: "top", label: "Top saved", emoji: "❤️" },
  { id: "featured", label: "Featured", emoji: "⭐" },
];

export const DEFAULT_STORY_FILTER = "newest";

export const SAVED_STORIES_KEY = "brightnews.savedStories";
export const ONBOARDING_DISMISSED_KEY = "brightnews.onboardingDismissed";
export const PREFERRED_REGION_KEY = "brightnews.preferredRegion";
export const APP_LANGUAGE_KEY = "brightnews.appLanguage";
export const STORY_LANGUAGE_FILTER_KEY = "brightnews.storyLanguageFilter";
export const THEME_PREFERENCE_KEY = "brightnews.themePreference";
export const SOURCE_READS_KEY = "brightnews.sourceReads";
export const USER_PREFERENCES_KEY = "brightnews.userPreferences";
export const SUPPORT_MODAL_DISMISSED_KEY = "brightnews.supportModalDismissedDate";
export const SUPPORT_MODAL_SUPPORTED_KEY = "brightnews.supportModalSupported";

export const FREE_SOURCE_READ_LIMIT = 5;
export const PREMIUM_PRODUCT_ID = "brightnews_premium_monthly";
export const PREMIUM_PRICE_LABEL = "€4.99/month";
export const PREMIUM_CHECKOUT_ENABLED = true;

export const THEME_PREFERENCES = ["system", "light", "dark"];

export const isPremiumProfile = profile =>
  profile?.plan === "premium" ||
  profile?.plan === "pro" ||
  (profile?.premium_until && new Date(profile.premium_until).getTime() > Date.now());

export const getCategoryMeta = id =>
  CATEGORIES.find(category => category.id === id) || CATEGORIES[1];

export const getCategoryThemeClass = id =>
  `bn-theme--${getCategoryMeta(id).theme}`;

export const getVisibleTabs = (session, profile) => {
  if (!session?.user) return TABS;

  return [
    ...TABS,
    ...(profile?.is_admin ? [{ id: "review", emoji: "🛠️", label: "Review" }] : []),
  ];
};

export const getRegionsForCodes = regionCodes => {
  const allowed = new Set(regionCodes);
  return REGIONS.filter(region => allowed.has(region.code));
};

export const getRegionContinentGroups = regions => {
  const regionByCode = new Map(regions.map(region => [region.code, region]));

  return REGION_CONTINENTS
    .map(continent => ({
      ...continent,
      regions: continent.regionCodes
        .map(code => regionByCode.get(code))
        .filter(Boolean),
    }))
    .filter(continent => continent.regions.length > 0);
};

export const getContinentIdForRegionCode = regionCode =>
  REGION_CONTINENTS.find(continent => continent.regionCodes.includes(regionCode))?.id ||
  REGION_CONTINENTS[0]?.id;

export const getLanguageForRegionCode = regionCode =>
  REGION_LANGUAGE_BY_CODE[regionCode] || "en";

export const getAvailableAppLanguages = () =>
  Object.values(LANGUAGE_META).filter(language => language.id !== "all");

const COUNTRY_TO_REGION_CODE = {
  au: "au",
  ba: "ba",
  br: "br",
  ca: "ca",
  de: "de",
  fr: "fr",
  gb: "uk",
  hr: "hr",
  in: "in",
  jp: "jp",
  my: "my",
  rs: "rs",
  si: "si",
  uk: "uk",
  us: "us",
};

const TIMEZONE_TO_REGION_CODE = {
  "Europe/Berlin": "de",
  "Europe/Belgrade": "rs",
  "Europe/London": "uk",
  "Europe/Ljubljana": "si",
  "Europe/Paris": "fr",
  "Europe/Sarajevo": "ba",
  "Europe/Zagreb": "hr",
  "America/Edmonton": "ca",
  "America/Halifax": "ca",
  "America/Montreal": "ca",
  "America/St_Johns": "ca",
  "America/Toronto": "ca",
  "America/Vancouver": "ca",
  "America/Winnipeg": "ca",
  "Asia/Kolkata": "in",
  "Asia/Kuala_Lumpur": "my",
  "Asia/Kuching": "my",
  "Asia/Tokyo": "jp",
  "Australia/Adelaide": "au",
  "Australia/Brisbane": "au",
  "Australia/Darwin": "au",
  "Australia/Hobart": "au",
  "Australia/Melbourne": "au",
  "Australia/Perth": "au",
  "Australia/Sydney": "au",
  "America/Sao_Paulo": "br",
  "America/Fortaleza": "br",
  "America/Manaus": "br",
  "America/Recife": "br",
};

export const inferPreferredRegionCode = () => {
  if (typeof navigator !== "undefined") {
    const localeCandidates = [navigator.language, ...(navigator.languages || [])]
      .filter(Boolean);

    for (const locale of localeCandidates) {
      const [, countryCode] = String(locale).split(/[-_]/);
      const regionCode = COUNTRY_TO_REGION_CODE[String(countryCode || "").toLowerCase()];
      if (regionCode) {
        return regionCode;
      }
    }
  }

  if (typeof Intl !== "undefined") {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone && TIMEZONE_TO_REGION_CODE[timezone]) {
      return TIMEZONE_TO_REGION_CODE[timezone];
    }
  }

  return "world";
};

export const inferPreferredAppLanguage = () => {
  if (typeof navigator !== "undefined") {
    const localeCandidates = [navigator.language, ...(navigator.languages || [])]
      .filter(Boolean);

    for (const locale of localeCandidates) {
      const languageCode = String(locale).split(/[-_]/)[0]?.toLowerCase();
      if (languageCode && LANGUAGE_META[languageCode] && languageCode !== "all") {
        return languageCode;
      }
    }
  }

  return "en";
};

export const getLanguageFiltersForStories = stories => {
  const languageIds = new Set(["all"]);

  for (const story of stories) {
    languageIds.add(story.languageCode || getLanguageForRegionCode(story.regionCode));
  }

  return Array.from(languageIds)
    .map(languageId => LANGUAGE_META[languageId])
    .filter(Boolean);
};
