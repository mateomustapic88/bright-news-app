import { CATEGORIES, getCategoryThemeClass } from "../constants";
import { getCategoryLabel } from "../i18n";
import Chip from "../components/Chip";
import EmptyState from "../components/EmptyState";
import HeroCard from "../components/HeroCard";
import StatusMessage from "../components/StatusMessage";
import StoryCard from "../components/StoryCard";

const HomeTab = ({
  category,
  setCategory,
  loading,
  firstLoad,
  error,
  shareFeedback,
  stories,
  expanded,
  saved,
  setExpanded,
  toggleSave,
  handleShareStory,
  t,
  uiLanguage,
}) => {
  const featuredStory = stories.reduce((best, story) => {
    if (!best) return story;
    if ((story.savedCount || 0) > (best.savedCount || 0)) return story;
    return best;
  }, null);

  const remainingStories = stories.filter(story => story.id !== featuredStory?.id);

  return (
    <section className="bn-tab bn-home-tab">
      <div className="bn-home-tab__filters-surface">
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
          <div className="bn-home-tab__intro">
            <div>
              <span className="bn-home-tab__kicker">{t("home.highlights")}</span>
              <h2>{t("home.title")}</h2>
              <p>{t("home.description")}</p>
            </div>
          </div>

          <div className="bn-home-tab__story-grid">
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
              <div key={story.id} className="bn-home-tab__story-cell">
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
          </div>
        </>
      )}
    </section>
  );
};

export default HomeTab;
