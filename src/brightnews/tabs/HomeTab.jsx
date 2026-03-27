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
}) => (
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

    {stories.length > 0 && (
      <>
        <SectionLabel icon="📌" label="Top Story" />
        <div className="bn-home-tab__hero">
          <HeroCard
            story={stories[0]}
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
          {stories.slice(1).map(story => (
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

export default HomeTab;
