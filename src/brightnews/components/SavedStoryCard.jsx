import { getCategoryMeta, getCategoryThemeClass } from "../constants";
import StoryShareButton from "./StoryShareButton";
import StorySourceLink from "./StorySourceLink";

const SavedStoryCard = ({ story, handleShareStory }) => {
  const category = getCategoryMeta(story.category);
  const themeClass = getCategoryThemeClass(story.category);

  return (
    <article className={`bn-saved-card ${themeClass}`.trim()}>
      <div className="bn-saved-card__media">{story.emoji}</div>

      <div className="bn-saved-card__content">
        <div className="bn-saved-card__topline">
          <span className="bn-category-pill">
            {category.emoji} {story.category}
          </span>
          <StoryShareButton story={story} handleShareStory={handleShareStory} />
        </div>
        <h3 className="bn-card-title">{story.headline}</h3>
        <span className="bn-card-location">📍 {story.location}</span>
        <StorySourceLink sourceUrl={story.sourceUrl} compact />
      </div>
    </article>
  );
};

export default SavedStoryCard;
