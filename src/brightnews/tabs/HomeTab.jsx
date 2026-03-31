import { CATEGORIES, getCategoryThemeClass } from "../constants";
import Chip from "../components/Chip";
import EmptyState from "../components/EmptyState";
import HeroCard from "../components/HeroCard";
import SectionLabel from "../components/SectionLabel";
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
}) => {
  const featuredStory = stories.reduce((best, story) => {
    if (!best) return story;
    if ((story.savedCount || 0) > (best.savedCount || 0)) return story;
    return best;
  }, null);

  const remainingStories = stories.filter(story => story.id !== featuredStory?.id);

  return (
    <section className="bn-tab bn-home-tab">
      <div className="bn-chip-row">
        {CATEGORIES.map(item => (
          <Chip
            key={item.id}
            active={category === item.id}
            onClick={() => setCategory(item.id)}
            className={`bn-chip--category ${getCategoryThemeClass(item.id)}`}
          >
            <span>{item.emoji}</span>
            <span>{item.label}</span>
          </Chip>
        ))}
      </div>

      {loading && firstLoad && (
        <StatusMessage variant="accent" showDot>
          Loading today&apos;s good news...
        </StatusMessage>
      )}

      {error && <StatusMessage variant="error">⚠️ {error}</StatusMessage>}
      {!error && shareFeedback && <StatusMessage variant={shareFeedback.variant}>{shareFeedback.message}</StatusMessage>}

      {!loading && !error && stories.length === 0 && (
        <EmptyState
          icon="🗞️"
          title="No stories found"
          description="There are no positive stories for this region and category yet. Try another filter or add more stories in Supabase."
        />
      )}

      {featuredStory && (
        <>
          <SectionLabel icon="📌" label="Top Story" />
          <div className="bn-home-tab__hero">
            <HeroCard
              story={featuredStory}
              expanded={expanded}
              firstLoad={firstLoad}
              saved={saved}
              setExpanded={setExpanded}
              toggleSave={toggleSave}
              handleShareStory={handleShareStory}
            />
          </div>

          <SectionLabel icon="🌟" label="More Good News" />
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
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default HomeTab;
