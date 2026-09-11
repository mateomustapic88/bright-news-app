import BrightNews from "./BrightNews";
import SeoRoundupPage from "./brightnews/pages/SeoRoundupPage";
import LocalizedSeoPage from "./brightnews/pages/LocalizedSeoPage";
import { getSeoRoute } from "./brightnews/seoRoutes";
import "./brightnews/styles/BrightNews.scss";

const App = () => {
  const seoRoute = typeof window !== "undefined" ? getSeoRoute(window.location.pathname) : null;

  if (seoRoute) {
    if (seoRoute.locale) return <LocalizedSeoPage page={seoRoute} />;
    return <SeoRoundupPage route={seoRoute} />;
  }

  return <BrightNews />;
};

export default App;
