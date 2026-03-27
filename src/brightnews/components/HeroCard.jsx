import { getCategoryMeta, getCategoryThemeClass } from "../constants";
import StoryImpact from "./StoryImpact";
import StorySaveButton from "./StorySaveButton";
import StoryShareButton from "./StoryShareButton";
import StorySourceLink from "./StorySourceLink";

const HeroCard = ({ story, expanded, firstLoad, saved, setExpanded, toggleSave, handleShareStory }) => {
  const category = getCategoryMeta(story.category);
  const themeClass = getCategoryThemeClass(story.category);
  const isExpanded = expanded === story.id;
  const isDimmed = firstLoad;

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
          />
        </div>
        <span className="bn-hero-card__emoji">{story.emoji}</span>
        <div className="bn-hero-card__category-tag">
          {category.emoji} {story.category}
        </div>
      </div>

      <div className="bn-hero-card__body">
        <div className="bn-card-meta">
          <span>📍 {story.location}</span>
          <span>{story.readTime}</span>
        </div>

        <h2 className="bn-card-title bn-card-title--hero">{story.headline}</h2>

        {isExpanded && (
          <div className="bn-card-details">
            <p className="bn-card-summary">{story.summary}</p>
            <StoryImpact impact={story.impact} themeClass={themeClass} />
            <StorySourceLink sourceUrl={story.sourceUrl} />
          </div>
        )}

        <div className="bn-card-toggle">{isExpanded ? "SHOW LESS ↑" : "READ MORE ↓"}</div>
      </div>
    </article>
  );
};

export default HeroCard;
