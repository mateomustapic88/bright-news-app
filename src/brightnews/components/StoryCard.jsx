import { getCategoryMeta, getCategoryThemeClass } from "../constants";
import StoryImpact from "./StoryImpact";
import StorySaveButton from "./StorySaveButton";
import StorySourceLink from "./StorySourceLink";

const StoryCard = ({ story, expanded, firstLoad, saved, setExpanded, toggleSave }) => {
  const category = getCategoryMeta(story.category);
  const themeClass = getCategoryThemeClass(story.category);
  const isExpanded = expanded === story.id;
  const isDimmed = firstLoad;

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
              {category.emoji} {story.category}
            </span>
            <StorySaveButton
              storyId={story.id}
              saved={saved}
              toggleSave={toggleSave}
            />
          </div>

          <h3 className="bn-card-title">{story.headline}</h3>
          <span className="bn-card-location">📍 {story.location}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="bn-story-card__details">
          <p className="bn-card-summary">{story.summary}</p>
          <StoryImpact impact={story.impact} compact themeClass={themeClass} />
          <StorySourceLink sourceUrl={story.sourceUrl} compact />
        </div>
      )}
    </article>
  );
};

export default StoryCard;
