import { getCategoryMeta, getCategoryThemeClass } from "../constants";
import { formatStoryPublishedAt, getCategoryLabel } from "../i18n";
import { getSourceBadge } from "../storyMeta";
import StoryMedia from "./StoryMedia";
import StoryImpact from "./StoryImpact";
import StorySaveButton from "./StorySaveButton";
import StoryShareButton from "./StoryShareButton";
import StorySourceLink from "./StorySourceLink";

const StoryCard = ({ story, expanded, firstLoad, saved, setExpanded, toggleSave, handleShareStory, t, uiLanguage }) => {
  const category = getCategoryMeta(story.category);
  const themeClass = getCategoryThemeClass(story.category);
  const isExpanded = expanded === story.id;
  const isDimmed = firstLoad;
  const sourceBadge = getSourceBadge(story.location);
  const publishedLabel = formatStoryPublishedAt(story.publishedAt, uiLanguage);

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
        <StoryMedia
          story={story}
          className="bn-story-card__icon"
          imageClassName="bn-story-card__image"
          fallbackClassName="bn-story-card__emoji"
        />

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
            <div className="bn-story-card__source-copy">
              <span className="bn-card-location">{story.location}</span>
              {publishedLabel ? <span className="bn-card-location">{publishedLabel}</span> : null}
            </div>
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
