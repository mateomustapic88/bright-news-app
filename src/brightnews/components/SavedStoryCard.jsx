import { getCategoryMeta, getCategoryThemeClass } from "../constants";
import { formatStoryPublishedAt, getCategoryLabel } from "../i18n";
import StoryMedia from "./StoryMedia";
import StorySaveButton from "./StorySaveButton";
import StoryShareButton from "./StoryShareButton";
import StorySourceLink from "./StorySourceLink";
import StoryActionIcon from "./StoryActionIcon";
import AppIcon from "./AppIcon";

const SavedStoryCard = ({
  story,
  saved,
  toggleSave,
  handleShareStory,
  handleReadSource,
  sourceReadState,
  t,
  uiLanguage,
  showSummary = false,
  readIds = [],
  onToggleRead,
}) => {
  const category = getCategoryMeta(story.category);
  const themeClass = getCategoryThemeClass(story.category);
  const publishedLabel = formatStoryPublishedAt(story.publishedAt, uiLanguage);

  return (
    <article className={`bn-saved-card ${themeClass}`.trim()}>
      <StoryMedia
        story={story}
        className="bn-saved-card__media"
        imageClassName="bn-saved-card__image"
        fallbackClassName="bn-saved-card__emoji"
      />

      <div className="bn-saved-card__content">
        <div className="bn-saved-card__topline">
          <span className="bn-category-pill">
            <AppIcon name={category.icon} size={13} />
            {getCategoryLabel(story.category, uiLanguage)}
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
        {showSummary && <p className="bn-weekly__summary">{story.summary}</p>}
        <div className="bn-saved-card__meta">
          <span className="bn-card-location bn-card-location--icon">
            <StoryActionIcon name="location" className="bn-card-meta__icon" />
            {story.location}
          </span>
          {publishedLabel ? <span className="bn-card-location">{publishedLabel}</span> : null}
        </div>
        <StorySourceLink
          story={story}
          sourceUrl={story.sourceUrl}
          compact
          label={t("story.readSource")}
          sourceReadState={sourceReadState}
          onReadSource={handleReadSource}
        />
        {onToggleRead && <button
          type="button"
          className="bn-reading-button bn-reading-button--status"
          aria-pressed={readIds.includes(story.id)}
          onClick={() => onToggleRead(story.id)}
        >
          <AppIcon name={readIds.includes(story.id) ? "check" : "clock"} size={16} />
          {t(readIds.includes(story.id) ? "reading.markUnread" : "reading.markRead")}
        </button>}
      </div>
    </article>
  );
};

export default SavedStoryCard;
