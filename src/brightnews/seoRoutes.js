export const SITE_URL = import.meta.env.VITE_SITE_URL || "https://brightnews-three.vercel.app";
export const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.mateomustapic.brightnews";

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
  {
    path: "/positive-news/australia",
    title: "Positive News Australia | BrightNews",
    heading: "Positive News Australia",
    eyebrow: "Australia edition",
    description: "Positive and constructive news from Australia, including health, science, nature and community stories.",
    keywords: "positive news Australia, good news Australia, uplifting Australian news",
    regionCode: "au",
    storyFilter: "newest",
  },
  {
    path: "/positive-news/japan",
    title: "Positive News Japan | BrightNews",
    heading: "Positive News Japan",
    eyebrow: "Japan edition",
    description: "Positive and constructive news from Japan, including science, health, innovation and community stories.",
    keywords: "positive news Japan, good news Japan, uplifting Japanese news",
    regionCode: "jp",
    storyFilter: "newest",
  },
  {
    path: "/positive-news/croatia",
    title: "Positive News Croatia | BrightNews",
    heading: "Positive News Croatia",
    eyebrow: "Croatia edition",
    description: "Positive and constructive news from Croatia, with stories about progress, health, science and local communities.",
    keywords: "positive news Croatia, good news Croatia, uplifting Croatian news",
    regionCode: "hr",
    storyFilter: "newest",
  },
];

export const getSeoRoute = pathname => {
  const normalizedPathname = String(pathname || "/").replace(/\/+$/, "") || "/";
  return SEO_ROUTES.find(route => route.path === normalizedPathname);
};

export const getSeoRouteLinks = () => SEO_ROUTES.map(route => ({
  ...route,
  url: `${SITE_URL}${route.path}`,
}));
