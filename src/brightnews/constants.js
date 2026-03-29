export const REGIONS = [
  { code: "world", flag: "🌍", label: "World" },
  { code: "us", flag: "🇺🇸", label: "USA" },
  { code: "uk", flag: "🇬🇧", label: "UK" },
  { code: "hr", flag: "🇭🇷", label: "Croatia" },
  { code: "de", flag: "🇩🇪", label: "Germany" },
  { code: "fr", flag: "🇫🇷", label: "France" },
  { code: "jp", flag: "🇯🇵", label: "Japan" },
  { code: "au", flag: "🇦🇺", label: "Australia" },
  { code: "br", flag: "🇧🇷", label: "Brazil" },
  { code: "in", flag: "🇮🇳", label: "India" },
];

export const LANGUAGE_META = {
  all: { id: "all", label: "All languages", shortLabel: "All", emoji: "🌐" },
  en: { id: "en", label: "English", shortLabel: "English", emoji: "🇬🇧" },
  hr: { id: "hr", label: "Croatian", shortLabel: "Croatian", emoji: "🇭🇷" },
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
  de: "de",
  fr: "fr",
  jp: "ja",
  au: "en",
  br: "pt",
  in: "en",
};

export const CATEGORIES = [
  { id: "all", label: "All", emoji: "✨", theme: "all" },
  { id: "Environment", label: "Planet", emoji: "🌿", theme: "environment" },
  { id: "Science", label: "Science", emoji: "🔬", theme: "science" },
  { id: "Community", label: "People", emoji: "🤝", theme: "community" },
  { id: "Health", label: "Health", emoji: "💚", theme: "health" },
  { id: "Animals", label: "Animals", emoji: "🐾", theme: "animals" },
  { id: "Innovation", label: "Tech", emoji: "💡", theme: "innovation" },
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

export const SAVED_STORIES_KEY = "brightnews.savedStories";
export const ONBOARDING_DISMISSED_KEY = "brightnews.onboardingDismissed";

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

export const getLanguageForRegionCode = regionCode =>
  REGION_LANGUAGE_BY_CODE[regionCode] || "en";

export const getLanguageFiltersForStories = stories => {
  const languageIds = new Set(["all"]);

  for (const story of stories) {
    languageIds.add(story.languageCode || getLanguageForRegionCode(story.regionCode));
  }

  return Array.from(languageIds)
    .map(languageId => LANGUAGE_META[languageId])
    .filter(Boolean);
};
