import EmptyState from "../components/EmptyState";
import SavedStoryCard from "../components/SavedStoryCard";
import StatusMessage from "../components/StatusMessage";

const SavedTab = ({
  savedStories,
  session,
  setTab,
  shareFeedback,
  handleShareStory,
}) => (
  <section className="bn-tab bn-saved-tab">
    <h2>{session?.user ? "❤️ Saved Stories" : "❤️ Saved Stories"}</h2>

    {shareFeedback && <StatusMessage variant={shareFeedback.variant}>{shareFeedback.message}</StatusMessage>}

    {!session?.user ? (
      <div className="bn-saved-tab__locked">
        <EmptyState
          icon="🔐"
          title="Sign in to view saved stories"
          description="Your saved list lives in your account now. Open Account to sign in with Google and sync it across devices."
        />
        <button
          type="button"
          onClick={() => setTab("account")}
          className="bn-button bn-button--primary"
        >
          Open Account
        </button>
      </div>
    ) : savedStories.length === 0 ? (
      <EmptyState
        icon="🤍"
        description="No saved stories yet. Tap ❤️ on any story to save it."
      />
    ) : (
      <div className="bn-stack">
        {savedStories.map(story => (
          <SavedStoryCard key={story.id} story={story} handleShareStory={handleShareStory} />
        ))}
      </div>
    )}
  </section>
);

export default SavedTab;
