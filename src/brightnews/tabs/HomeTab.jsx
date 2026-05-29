import { useEffect, useRef, useState } from "react";
import {
  CATEGORIES,
  STORY_FILTERS,
  getContinentIdForRegionCode,
  getRegionContinentGroups,
  getCategoryThemeClass,
} from "../constants";
import { getCategoryLabel, getRegionLabel, getStoryFilterLabel } from "../i18n";
import Chip from "../components/Chip";
import EmptyState from "../components/EmptyState";
import HeroCard from "../components/HeroCard";
import SectionLabel from "../components/SectionLabel";
import StatusMessage from "../components/StatusMessage";
import StoryCard from "../components/StoryCard";

const FEATURED_POOL_SIZE = 12;
const getFeaturedStory = (stories, category, storyFilter) => {
  const featuredPool = stories.slice(0, FEATURED_POOL_SIZE);

  if (storyFilter !== "featured") {
    return featuredPool[0] || null;
  }

  if (category && category !== "all") {
    return featuredPool[0] || null;
  }

  return featuredPool.reduce((best, story) => {
    if (!best) return story;
    if (getAllCategoryFeaturedStoryScore(story) > getAllCategoryFeaturedStoryScore(best)) return story;
    return best;
  }, null);
};

const getAllCategoryFeaturedStoryScore = story => {
  if (!story) return -Infinity;

  return (Number(story.savedCount || 0) * 1000) + getFeaturedStoryScore(story);
};

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
  region,
  regions,
  setRegion,
  category,
  setCategory,
  storyFilter = "newest",
  setStoryFilter,
  feedMode = "standard",
  personalizedFeedAvailable = false,
  handleSelectPersonalizedFeed,
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
  handleReportStory,
  handleReadSource,
  sourceReadState,
  t,
  uiLanguage,
}) => {
  const loadMoreRef = useRef(null);
  const [desktopFeedEnabled, setDesktopFeedEnabled] = useState(() => (
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1025px)").matches : false
  ));
  const [mobileFilterPanel, setMobileFilterPanel] = useState(null);
  const [activeMobileContinentId, setActiveMobileContinentId] = useState(null);
  const continentGroups = getRegionContinentGroups(regions);
  const selectedRegionContinentId = region === "world" ? null : getContinentIdForRegionCode(region);
  const visibleMobileContinentId = activeMobileContinentId || selectedRegionContinentId;
  const worldRegion = regions.find(item => item.code === "world");
  const selectedRegion = regions.find(item => item.code === region) || worldRegion || regions[0];
  const selectedCategory = CATEGORIES.find(item => item.id === category) || CATEGORIES[0];
  const selectedStoryFilter = STORY_FILTERS.find(item => item.id === storyFilter) || STORY_FILTERS[0];
  const categoryButtonLabel = feedMode === "personalized"
    ? t("home.personalizedFeed")
    : getCategoryLabel(selectedCategory.id, uiLanguage);
  const featuredStory = getFeaturedStory(stories, category, storyFilter);

  const remainingStories = stories.filter(story => story.id !== featuredStory?.id);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(min-width: 1025px)");
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
            {personalizedFeedAvailable ? (
              <Chip
                active={feedMode === "personalized"}
                onClick={handleSelectPersonalizedFeed}
                className="bn-chip--category bn-chip--personalized bn-theme--all"
              >
                <span>✨</span>
                <span>{t("home.personalizedFeed")}</span>
              </Chip>
            ) : null}
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

          <div className="bn-home-tab__filter-group">
            <span className="bn-home-tab__filter-label">{t("home.storyFilter")}</span>
            <div className="bn-chip-row bn-chip-row--surface bn-chip-row--feed-filters">
              {STORY_FILTERS.map(item => (
                <Chip
                  key={item.id}
                  active={storyFilter === item.id}
                  onClick={() => setStoryFilter(item.id)}
                  className="bn-chip--feed-filter"
                >
                  <span>{item.emoji}</span>
                  <span>{getStoryFilterLabel(item.id, uiLanguage)}</span>
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bn-home-tab__filters-mobile">
        <div className="bn-home-tab__mobile-filter-bar">
          <button
            type="button"
            className={`bn-mobile-filter-button${mobileFilterPanel === "region" ? " is-open" : ""}`}
            onClick={() => setMobileFilterPanel(current => (current === "region" ? null : "region"))}
            aria-expanded={mobileFilterPanel === "region"}
          >
            <span className="bn-mobile-filter-button__icon">{selectedRegion?.flag || "🌍"}</span>
            <span className="bn-mobile-filter-button__copy">
              <small>{t("header.edition")}</small>
              <strong>{selectedRegion ? getRegionLabel(selectedRegion.code, uiLanguage) : getRegionLabel("world", uiLanguage)}</strong>
            </span>
            <span className="bn-mobile-filter-button__chevron" aria-hidden="true">⌄</span>
          </button>

          <button
            type="button"
            className={`bn-mobile-filter-button bn-mobile-filter-button--category ${getCategoryThemeClass(selectedCategory.id)}${mobileFilterPanel === "category" ? " is-open" : ""}`}
            onClick={() => setMobileFilterPanel(current => (current === "category" ? null : "category"))}
            aria-expanded={mobileFilterPanel === "category"}
          >
            <span className="bn-mobile-filter-button__icon">{feedMode === "personalized" ? "✨" : selectedCategory.emoji}</span>
            <span className="bn-mobile-filter-button__copy">
              <small>{t("home.category")}</small>
              <strong>{categoryButtonLabel}</strong>
            </span>
            <span className="bn-mobile-filter-button__chevron" aria-hidden="true">⌄</span>
          </button>

          <button
            type="button"
            className={`bn-mobile-filter-button bn-mobile-filter-button--story-filter${mobileFilterPanel === "storyFilter" ? " is-open" : ""}`}
            onClick={() => setMobileFilterPanel(current => (current === "storyFilter" ? null : "storyFilter"))}
            aria-expanded={mobileFilterPanel === "storyFilter"}
          >
            <span className="bn-mobile-filter-button__icon">{selectedStoryFilter.emoji}</span>
            <span className="bn-mobile-filter-button__copy">
              <small>{t("home.filter")}</small>
              <strong>{getStoryFilterLabel(selectedStoryFilter.id, uiLanguage)}</strong>
            </span>
            <span className="bn-mobile-filter-button__chevron" aria-hidden="true">⌄</span>
          </button>
        </div>

        {mobileFilterPanel === "region" ? (
          <div className="bn-mobile-filter-panel" aria-label={t("header.edition")}>
            <div className="bn-mobile-filter-panel__options">
              {worldRegion ? (
                <button
                  type="button"
                  onClick={() => {
                    setRegion("world");
                    setActiveMobileContinentId(null);
                    setMobileFilterPanel(null);
                  }}
                  className={`bn-region-button${region === "world" ? " is-active" : ""}`}
                >
                  <span className="bn-region-button__flag">{worldRegion.flag}</span>
                  <span>{getRegionLabel("world", uiLanguage)}</span>
                </button>
              ) : null}

              {continentGroups.map(item => (
                <div key={item.id} className="bn-mobile-filter-panel__continent-group">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMobileContinentId(current => (current === item.id ? null : item.id));
                    }}
                    className={`bn-region-button bn-region-button--continent${visibleMobileContinentId === item.id ? " is-active" : ""}`}
                    aria-expanded={visibleMobileContinentId === item.id}
                  >
                    <span className="bn-region-button__flag">{item.emoji}</span>
                    <span>{item.label}</span>
                    <span className="bn-region-button__chevron" aria-hidden="true">⌄</span>
                  </button>

                  {visibleMobileContinentId === item.id ? (
                    <div className="bn-mobile-filter-panel__countries">
                      {item.regions.map(regionItem => (
                        <button
                          key={regionItem.code}
                          type="button"
                          onClick={() => {
                            setRegion(regionItem.code);
                            setActiveMobileContinentId(item.id);
                            setMobileFilterPanel(null);
                          }}
                          className={`bn-region-button bn-region-button--country${region === regionItem.code ? " is-active" : ""}`}
                        >
                          <span className="bn-region-button__flag">{regionItem.flag}</span>
                          <span>{getRegionLabel(regionItem.code, uiLanguage)}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {mobileFilterPanel === "category" ? (
          <div className="bn-mobile-filter-panel bn-mobile-filter-panel--categories" aria-label={t("home.category")}>
            {personalizedFeedAvailable ? (
              <Chip
                active={feedMode === "personalized"}
                onClick={() => {
                  handleSelectPersonalizedFeed?.();
                  setMobileFilterPanel(null);
                }}
                className="bn-chip--category bn-chip--personalized bn-theme--all"
              >
                <span>✨</span>
                <span>{t("home.personalizedFeed")}</span>
              </Chip>
            ) : null}
            {CATEGORIES.map(item => (
              <Chip
                key={item.id}
                active={category === item.id}
                onClick={() => {
                  setCategory(item.id);
                  setMobileFilterPanel(null);
                }}
                className={`bn-chip--category ${getCategoryThemeClass(item.id)}`}
              >
                <span>{item.emoji}</span>
                <span>{getCategoryLabel(item.id, uiLanguage)}</span>
              </Chip>
            ))}
          </div>
        ) : null}

        {mobileFilterPanel === "storyFilter" ? (
          <div className="bn-mobile-filter-panel bn-mobile-filter-panel--story-filters" aria-label={t("home.storyFilter")}>
            {STORY_FILTERS.map(item => (
              <Chip
                key={item.id}
                active={storyFilter === item.id}
                onClick={() => {
                  setStoryFilter(item.id);
                  setMobileFilterPanel(null);
                }}
                className="bn-chip--feed-filter"
              >
                <span>{item.emoji}</span>
                <span>{getStoryFilterLabel(item.id, uiLanguage)}</span>
              </Chip>
            ))}
          </div>
        ) : null}
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
                handleReportStory={handleReportStory}
                handleReadSource={handleReadSource}
                sourceReadState={sourceReadState}
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
                  handleReportStory={handleReportStory}
                  handleReadSource={handleReadSource}
                  sourceReadState={sourceReadState}
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
                handleReportStory={handleReportStory}
                handleReadSource={handleReadSource}
                sourceReadState={sourceReadState}
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
                  handleReportStory={handleReportStory}
                  handleReadSource={handleReadSource}
                  sourceReadState={sourceReadState}
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
