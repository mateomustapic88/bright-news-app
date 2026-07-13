import EmptyState from "../components/EmptyState";
import SavedStoryCard from "../components/SavedStoryCard";
import StatusMessage from "../components/StatusMessage";
import AppIcon from "../components/AppIcon";

const SavedTab = ({
  savedStories,
  saved,
  session,
  setTab,
  shareFeedback,
  toggleSave,
  handleShareStory,
  handleReadSource,
  sourceReadState,
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
      {session?.user ? (
        <div className="bn-tab-heading">
          <AppIcon name="bookmark" size={24} />
          <h2>{t("saved.title").replace(/^[^\p{L}\p{N}]+/u, "")}</h2>
        </div>
      ) : null}

      {shareFeedback && <StatusMessage variant={shareFeedback.variant}>{shareFeedback.message}</StatusMessage>}

      {!session?.user ? (
        <div className="bn-saved-tab__locked">
          <EmptyState
            icon={<AppIcon name="lock" size={38} strokeWidth={1.7} />}
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
          icon={<AppIcon name="bookmark" size={38} strokeWidth={1.7} />}
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
              handleReadSource={handleReadSource}
              sourceReadState={sourceReadState}
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
