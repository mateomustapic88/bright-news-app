import { useEffect, useRef, useState } from "react";
import { CATEGORIES, getCategoryThemeClass } from "../constants";
import { getCategoryLabel } from "../i18n";
import Chip from "../components/Chip";
import EmptyState from "../components/EmptyState";
import HeroCard from "../components/HeroCard";
import SectionLabel from "../components/SectionLabel";
import StatusMessage from "../components/StatusMessage";
import StoryCard from "../components/StoryCard";

const FEATURED_POOL_SIZE = 12;
const getFeaturedStoryScore = story => {
  if (!story) return -Infinity;

  const publishedAt = story.publishedAt ? new Date(story.publishedAt) : null;
  const ageHours = publishedAt && !Number.isNaN(publishedAt.getTime())
    ? (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60)
    : Number.POSITIVE_INFINITY;

  let score = 0;

  if (story.isPinned) score += 24;
  if (ageHours <= 24) score += 12;
  else if (ageHours <= 48) score += 9;
  else if (ageHours <= 72) score += 6;
  else if (ageHours <= 7 * 24) score += 2;
  else score -= 8;

  if (story.imageUrl) score += 2;
  if ((story.summary || "").length >= 120) score += 1.5;
  if ((story.savedCount || 0) > 0) score += Math.min(story.savedCount, 5) * 0.35;

  if (story.category === "Science" || story.category === "Health" || story.category === "Innovation") {
    score += 0.6;
  }

  return score;
};

const HomeTab = ({
  category,
  setCategory,
  loading,
  loadingMore,
  firstLoad,
  error,
  shareFeedback,
  stories,
  hasMore,
  onLoadMore,
  expanded,
  saved,
  setExpanded,
  toggleSave,
  handleShareStory,
  t,
  uiLanguage,
}) => {
  const loadMoreRef = useRef(null);
  const [desktopFeedEnabled, setDesktopFeedEnabled] = useState(() => (
    typeof window !== "undefined" ? window.matchMedia("(min-width: 769px)").matches : false
  ));
  const featuredPool = stories.slice(0, FEATURED_POOL_SIZE);

  const featuredStory = featuredPool.reduce((best, story) => {
    if (!best) return story;
    if (getFeaturedStoryScore(story) > getFeaturedStoryScore(best)) return story;
    return best;
  }, null);

  const remainingStories = stories.filter(story => story.id !== featuredStory?.id);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(min-width: 769px)");
    const syncDesktopMode = event => {
      setDesktopFeedEnabled(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncDesktopMode);
      return () => mediaQuery.removeEventListener("change", syncDesktopMode);
    }

    mediaQuery.addListener(syncDesktopMode);
    return () => mediaQuery.removeListener(syncDesktopMode);
  }, []);

  useEffect(() => {
    if (!desktopFeedEnabled || !hasMore || loading || loadingMore || !onLoadMore) return undefined;
    if (!loadMoreRef.current) return undefined;

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      {
        rootMargin: "300px 0px",
      },
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [desktopFeedEnabled, hasMore, loading, loadingMore, onLoadMore, stories.length]);

  return (
    <section className="bn-tab bn-home-tab">
      <div className="bn-home-tab__filters-surface bn-home-tab__filters-surface--desktop">
        <div className="bn-home-tab__filters-copy">
          <span className="bn-home-tab__filters-kicker">{t("home.exploreFeed")}</span>
          <p>{t("home.exploreDescription")}</p>
        </div>

        <div className="bn-home-tab__filters">
          <div className="bn-chip-row bn-chip-row--surface">
            {CATEGORIES.map(item => (
              <Chip
                key={item.id}
                active={category === item.id}
                onClick={() => setCategory(item.id)}
                className={`bn-chip--category ${getCategoryThemeClass(item.id)}`}
              >
                <span>{item.emoji}</span>
                <span>{getCategoryLabel(item.id, uiLanguage)}</span>
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="bn-home-tab__filters-mobile">
        <div className="bn-chip-row">
          {CATEGORIES.map(item => (
            <Chip
              key={item.id}
              active={category === item.id}
              onClick={() => setCategory(item.id)}
              className={`bn-chip--category ${getCategoryThemeClass(item.id)}`}
            >
              <span>{item.emoji}</span>
              <span>{getCategoryLabel(item.id, uiLanguage)}</span>
            </Chip>
          ))}
        </div>
      </div>

      {loading && firstLoad && (
        <StatusMessage variant="accent" showDot>
          {t("home.loading")}
        </StatusMessage>
      )}

      {error && <StatusMessage variant="error">⚠️ {error}</StatusMessage>}
      {!error && shareFeedback && <StatusMessage variant={shareFeedback.variant}>{shareFeedback.message}</StatusMessage>}

      {!loading && !error && stories.length === 0 && (
        <EmptyState
          icon="🗞️"
          title={t("home.noStoriesTitle")}
          description={t("home.noStoriesDescription")}
        />
      )}

      {featuredStory && (
        <>
          <div className="bn-home-tab__intro bn-home-tab__intro--desktop">
            <div>
              <span className="bn-home-tab__kicker">{t("home.highlights")}</span>
              <h2>{t("home.title")}</h2>
              <p>{t("home.description")}</p>
            </div>
          </div>

          <div className="bn-home-tab__story-grid bn-home-tab__story-grid--desktop">
            <div className="bn-home-tab__lead">
              <HeroCard
                story={featuredStory}
                expanded={expanded}
                firstLoad={firstLoad}
                saved={saved}
                setExpanded={setExpanded}
                toggleSave={toggleSave}
                handleShareStory={handleShareStory}
                t={t}
                uiLanguage={uiLanguage}
              />
            </div>

            {remainingStories.map(story => (
              <div
                key={story.id}
                className={`bn-home-tab__story-cell${expanded === story.id ? " is-expanded" : ""}`}
              >
                <StoryCard
                  story={story}
                  expanded={expanded}
                  firstLoad={firstLoad}
                  saved={saved}
                  setExpanded={setExpanded}
                  toggleSave={toggleSave}
                  handleShareStory={handleShareStory}
                  t={t}
                  uiLanguage={uiLanguage}
                />
              </div>
            ))}

            {desktopFeedEnabled && hasMore ? <div ref={loadMoreRef} className="bn-home-tab__load-trigger" aria-hidden="true" /> : null}
          </div>

          <div className="bn-home-tab__mobile-flow">
            <SectionLabel icon="📌" label={t("home.topStory")} />
            <div className="bn-home-tab__hero">
              <HeroCard
                story={featuredStory}
                expanded={expanded}
                firstLoad={firstLoad}
                saved={saved}
                setExpanded={setExpanded}
                toggleSave={toggleSave}
                handleShareStory={handleShareStory}
                t={t}
                uiLanguage={uiLanguage}
              />
            </div>

            {remainingStories.length > 0 ? <SectionLabel icon="🌟" label={t("home.moreGoodNews")} /> : null}
            <div className="bn-stack">
              {remainingStories.map(story => (
                <StoryCard
                  key={story.id}
                  story={story}
                  expanded={expanded}
                  firstLoad={firstLoad}
                  saved={saved}
                  setExpanded={setExpanded}
                  toggleSave={toggleSave}
                  handleShareStory={handleShareStory}
                  t={t}
                  uiLanguage={uiLanguage}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {loadingMore ? (
        <div className="bn-home-tab__loading-more">
          <StatusMessage variant="accent" showDot>
            {t("header.refreshingStories")}
          </StatusMessage>
        </div>
      ) : null}
    </section>
  );
};

export default HomeTab;
