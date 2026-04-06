import { getCategoryMeta, getCategoryThemeClass } from "../constants";
import { formatStoryPublishedAt, getCategoryLabel } from "../i18n";
import StoryMedia from "./StoryMedia";
import StoryImpact from "./StoryImpact";
import StorySaveButton from "./StorySaveButton";
import StoryShareButton from "./StoryShareButton";
import StorySourceLink from "./StorySourceLink";

const HeroCard = ({ story, expanded, firstLoad, saved, setExpanded, toggleSave, handleShareStory, t, uiLanguage }) => {
  const category = getCategoryMeta(story.category);
  const themeClass = getCategoryThemeClass(story.category);
  const isExpanded = expanded === story.id;
  const isDimmed = firstLoad;
  const publishedLabel = formatStoryPublishedAt(story.publishedAt, uiLanguage);

  const classes = [
    "bn-hero-card",
    themeClass,
    isExpanded ? "is-expanded" : "",
    isDimmed ? "is-dimmed" : "",
  ].filter(Boolean).join(" ");

  return (
    <article
      className={classes}
      onClick={() => !isDimmed && setExpanded(isExpanded ? null : story.id)}
    >
      <div className="bn-hero-card__media">
        <StoryMedia
          story={story}
          className="bn-story-media bn-story-media--hero"
          imageClassName="bn-story-media__image bn-story-media__image--hero"
          fallbackClassName="bn-hero-card__emoji"
        />
        <div className="bn-hero-card__actions">
          <StoryShareButton
            story={story}
            handleShareStory={handleShareStory}
            variant="hero"
          />
          <StorySaveButton
            storyId={story.id}
            saved={saved}
            toggleSave={toggleSave}
            variant="hero"
            t={t}
          />
        </div>
        <div className="bn-hero-card__category-tag">
          {category.emoji} {getCategoryLabel(story.category, uiLanguage)}
        </div>
      </div>

      <div className="bn-hero-card__body">
        <div className="bn-card-meta">
          <span>📍 {story.location}</span>
          {publishedLabel ? <span>{publishedLabel}</span> : null}
          <span>{story.readTime}</span>
        </div>

        <h2 className="bn-card-title bn-card-title--hero">{story.headline}</h2>

        {isExpanded && (
          <div className="bn-card-details">
            <p className="bn-card-summary">{story.summary}</p>
            <StoryImpact impact={story.impact} themeClass={themeClass} />
            <StorySourceLink sourceUrl={story.sourceUrl} label={t("story.readSource")} />
          </div>
        )}

        <div className="bn-card-toggle">{isExpanded ? t("home.showLess") : t("home.readMore")}</div>
      </div>
    </article>
  );
};

export default HeroCard;
