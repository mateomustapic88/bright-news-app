import { getCategoryMeta, getCategoryThemeClass } from "../constants";
import { formatStoryPublishedAt, getCategoryLabel } from "../i18n";
import StoryMedia from "./StoryMedia";
import StorySaveButton from "./StorySaveButton";
import StoryShareButton from "./StoryShareButton";
import StorySourceLink from "./StorySourceLink";

const SavedStoryCard = ({ story, saved, toggleSave, handleShareStory, t, uiLanguage }) => {
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
        <div className="bn-saved-card__meta">
          <span className="bn-card-location">📍 {story.location}</span>
          {publishedLabel ? <span className="bn-card-location">{publishedLabel}</span> : null}
        </div>
        <StorySourceLink sourceUrl={story.sourceUrl} compact label={t("story.readSource")} />
      </div>
    </article>
  );
};

export default SavedStoryCard;
