import EmptyState from "../components/EmptyState";
import SavedStoryCard from "../components/SavedStoryCard";
import StatusMessage from "../components/StatusMessage";

const SavedTab = ({
  savedStories,
  saved,
  session,
  setTab,
  shareFeedback,
  toggleSave,
  handleShareStory,
  t,
  uiLanguage,
}) => {
  const stateClass = !session?.user
    ? "bn-saved-tab--locked"
    : savedStories.length === 0
      ? "bn-saved-tab--empty"
      : "bn-saved-tab--list";

  return (
    <section className={`bn-tab bn-saved-tab ${stateClass}`}>
      {session?.user ? <h2>{t("saved.title")}</h2> : null}

      {shareFeedback && <StatusMessage variant={shareFeedback.variant}>{shareFeedback.message}</StatusMessage>}

      {!session?.user ? (
        <div className="bn-saved-tab__locked">
          <EmptyState
            icon="🔐"
            title={t("saved.signInTitle")}
            description={t("saved.signInDescriptionGeneric")}
          />
          <button
            type="button"
            onClick={() => setTab("account")}
            className="bn-button bn-button--primary"
          >
            {t("saved.openAccount")}
          </button>
        </div>
      ) : savedStories.length === 0 ? (
        <EmptyState
          icon="🤍"
          description={t("saved.emptyDescription")}
        />
      ) : (
        <div className="bn-stack">
          {savedStories.map(story => (
            <SavedStoryCard
              key={story.id}
              story={story}
              saved={saved}
              toggleSave={toggleSave}
              handleShareStory={handleShareStory}
              t={t}
              uiLanguage={uiLanguage}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default SavedTab;
