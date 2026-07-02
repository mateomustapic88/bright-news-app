export const SITE_URL = import.meta.env?.VITE_SITE_URL || "https://brightnews.app";
export const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.mateomustapic.brightnews";

const countryRoute = ({
  slug,
  country,
  regionCode,
  adjective,
}) => ({
  path: `/positive-news/${slug}`,
  title: `Positive News ${country} | BrightNews`,
  heading: `Positive News ${country}`,
  eyebrow: `${country} edition`,
  description: `Positive and constructive news from ${country}, including health, science, nature, innovation and community stories.`,
  keywords: `positive news ${country}, good news ${country}, uplifting ${adjective} news`,
  regionCode,
  storyFilter: "newest",
});

const usaRoute = ({
  path,
  title,
  heading,
  eyebrow,
  description,
  keywords,
  categoryId = "all",
  storyFilter = "newest",
}) => ({
  path,
  title,
  heading,
  eyebrow,
  description,
  keywords,
  regionCode: "us",
  categoryId,
  storyFilter,
});

export const SEO_ROUTES = [
  {
    path: "/positive-news-today",
    title: "Positive News Today | BrightNews",
    heading: "Positive News Today",
    eyebrow: "Updated daily",
    description: "Read uplifting, constructive and hopeful news from around the world, curated by BrightNews.",
    keywords: "positive news today, good news today, uplifting news, hopeful news",
    regionCode: "world",
    storyFilter: "newest",
  },
  {
    path: "/good-news-this-week",
    title: "Good News This Week | BrightNews",
    heading: "Good News This Week",
    eyebrow: "Weekly roundup",
    description: "A calm roundup of good news, progress stories and constructive updates from the latest BrightNews feed.",
    keywords: "good news this week, positive stories this week, uplifting stories 2026",
    regionCode: "world",
    storyFilter: "featured",
  },
  {
    path: "/uplifting-stories",
    title: "Uplifting Stories From Around the World | BrightNews",
    heading: "Uplifting Stories",
    eyebrow: "BrightNews roundup",
    description: "Discover positive stories about people, health, science, nature, innovation and meaningful progress.",
    keywords: "uplifting stories, positive stories, constructive news, feel good news",
    regionCode: "world",
    storyFilter: "top",
  },
  countryRoute({ slug: "usa", country: "USA", regionCode: "us", adjective: "American" }),
  usaRoute({
    path: "/positive-news/usa/today",
    title: "Positive News Today USA | BrightNews",
    heading: "Positive News Today USA",
    eyebrow: "USA daily roundup",
    description: "Fresh positive news from the USA today, with uplifting American stories about progress, people, health, science and communities.",
    keywords: "positive news today USA, good news today USA, uplifting news America, positive American news today",
  }),
  usaRoute({
    path: "/good-news/usa/this-week",
    title: "Good News USA This Week | BrightNews",
    heading: "Good News USA This Week",
    eyebrow: "USA weekly roundup",
    description: "A weekly roundup of good news from the USA, focused on constructive American stories and hopeful updates.",
    keywords: "good news USA this week, positive stories America this week, uplifting American stories",
    storyFilter: "featured",
  }),
  usaRoute({
    path: "/uplifting-stories/usa",
    title: "Uplifting Stories USA | BrightNews",
    heading: "Uplifting Stories USA",
    eyebrow: "American stories",
    description: "Uplifting stories from the USA about kindness, progress, discovery, resilience and everyday people making life brighter.",
    keywords: "uplifting stories USA, uplifting American stories, feel good news USA, positive stories America",
    storyFilter: "top",
  }),
  usaRoute({
    path: "/positive-news/usa/health",
    title: "Positive Health News USA | BrightNews",
    heading: "Positive Health News USA",
    eyebrow: "USA health",
    description: "Positive health news from the USA, including medical progress, wellbeing, research and constructive healthcare stories.",
    keywords: "positive health news USA, good health news America, uplifting healthcare news USA",
    categoryId: "Health",
  }),
  usaRoute({
    path: "/positive-news/usa/science",
    title: "Positive Science News USA | BrightNews",
    heading: "Positive Science News USA",
    eyebrow: "USA science",
    description: "Positive science news from the USA, including research breakthroughs, discovery, education and innovation stories.",
    keywords: "positive science news USA, good science news America, uplifting science stories USA",
    categoryId: "Science",
  }),
  usaRoute({
    path: "/positive-news/usa/environment",
    title: "Positive Environment News USA | BrightNews",
    heading: "Positive Environment News USA",
    eyebrow: "USA environment",
    description: "Positive environmental news from the USA, including nature, conservation, climate progress and community action.",
    keywords: "positive environment news USA, good climate news America, conservation news USA, uplifting nature stories USA",
    categoryId: "Environment",
  }),
  countryRoute({ slug: "uk", country: "UK", regionCode: "uk", adjective: "British" }),
  countryRoute({ slug: "croatia", country: "Croatia", regionCode: "hr", adjective: "Croatian" }),
  countryRoute({ slug: "slovenia", country: "Slovenia", regionCode: "si", adjective: "Slovenian" }),
  countryRoute({ slug: "serbia", country: "Serbia", regionCode: "rs", adjective: "Serbian" }),
  countryRoute({ slug: "bosnia-and-herzegovina", country: "Bosnia and Herzegovina", regionCode: "ba", adjective: "Bosnian" }),
  countryRoute({ slug: "germany", country: "Germany", regionCode: "de", adjective: "German" }),
  countryRoute({ slug: "france", country: "France", regionCode: "fr", adjective: "French" }),
  countryRoute({ slug: "canada", country: "Canada", regionCode: "ca", adjective: "Canadian" }),
  countryRoute({ slug: "japan", country: "Japan", regionCode: "jp", adjective: "Japanese" }),
  countryRoute({ slug: "australia", country: "Australia", regionCode: "au", adjective: "Australian" }),
  countryRoute({ slug: "brazil", country: "Brazil", regionCode: "br", adjective: "Brazilian" }),
  countryRoute({ slug: "india", country: "India", regionCode: "in", adjective: "Indian" }),
];

export const getSeoRoute = pathname => {
  const normalizedPathname = String(pathname || "/").replace(/\/+$/, "") || "/";
  return SEO_ROUTES.find(route => route.path === normalizedPathname);
};

export const getSeoRouteLinks = () => SEO_ROUTES.map(route => ({
  ...route,
  url: `${SITE_URL}${route.path}`,
}));
