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
