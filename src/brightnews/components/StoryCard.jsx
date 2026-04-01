import { getCategoryMeta, getCategoryThemeClass } from "../constants";
import { getCategoryLabel } from "../i18n";
import StoryImpact from "./StoryImpact";
import StorySaveButton from "./StorySaveButton";
import StoryShareButton from "./StoryShareButton";
import StorySourceLink from "./StorySourceLink";

const getSourceBadge = value =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("") || "BN";

const StoryCard = ({ story, expanded, firstLoad, saved, setExpanded, toggleSave, handleShareStory, t, uiLanguage }) => {
  const category = getCategoryMeta(story.category);
  const themeClass = getCategoryThemeClass(story.category);
  const isExpanded = expanded === story.id;
  const isDimmed = firstLoad;
  const sourceBadge = getSourceBadge(story.location);

  const classes = [
    "bn-story-card",
    themeClass,
    isExpanded ? "is-expanded" : "",
    isDimmed ? "is-dimmed" : "",
  ].filter(Boolean).join(" ");

  return (
    <article
      className={classes}
      onClick={() => !isDimmed && setExpanded(isExpanded ? null : story.id)}
    >
      <div className="bn-story-card__header">
        <div className="bn-story-card__icon">{story.emoji}</div>

        <div className="bn-story-card__content">
          <div className="bn-story-card__topline">
            <span className="bn-category-pill">
              {category.emoji} {getCategoryLabel(story.category, uiLanguage)}
            </span>
            <div className="bn-story-card__actions">
              <StoryShareButton story={story} handleShareStory={handleShareStory} />
              <StorySaveButton
                storyId={story.id}
                saved={saved}
                toggleSave={toggleSave}
                t={t}
              />
            </div>
          </div>

          <h3 className="bn-card-title">{story.headline}</h3>
          <div className="bn-story-card__source">
            <span className="bn-story-card__source-badge">{sourceBadge}</span>
            <span className="bn-card-location">{story.location}</span>
          </div>
          <p className={`bn-card-summary bn-card-summary--preview${isExpanded ? " is-expanded" : ""}`}>
            {story.summary}
          </p>
        </div>
      </div>

      {isExpanded && (
        <div className="bn-story-card__details">
          <StoryImpact impact={story.impact} compact themeClass={themeClass} />
          <StorySourceLink sourceUrl={story.sourceUrl} compact label={t("story.readSource")} />
        </div>
      )}
    </article>
  );
};

export default StoryCard;
