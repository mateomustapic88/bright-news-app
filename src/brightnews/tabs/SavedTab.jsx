import EmptyState from "../components/EmptyState";
import SavedStoryCard from "../components/SavedStoryCard";
import StatusMessage from "../components/StatusMessage";
import AppIcon from "../components/AppIcon";
import { useState } from "react";
import { CATEGORIES } from "../constants";
import { getCategoryLabel } from "../i18n";
import { filterSavedLibrary } from "../readingHistory";

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
  isPremium = false,
  readIds = [],
  onToggleRead,
}) => {
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const filtered = isPremium ? filterSavedLibrary(savedStories, { category, status, search, readIds }) : savedStories;
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

      {session?.user && savedStories.length > 0 && (isPremium ? <div className="bn-library-tools">
        <label className="bn-library-search"><AppIcon name="search" size={18} /><input type="search" value={search} onChange={event => setSearch(event.target.value)} aria-label={t("reading.search")} placeholder={t("reading.search")} /></label>
        <div className="bn-reading-segments" role="group" aria-label={t("reading.status")}>
          {["all", "unread", "read"].map(value => <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)}>{t(`reading.${value}`)}</button>)}
        </div>
        <div className="bn-library-categories" role="group" aria-label={t("home.category")}>
          {CATEGORIES.filter(item => item.id === "all" || savedStories.some(story => story.category === item.id)).map(item => <button className="bn-reading-button" type="button" key={item.id} aria-pressed={category === item.id} onClick={() => setCategory(item.id)}><AppIcon name={item.icon} size={16} />{getCategoryLabel(item.id, uiLanguage)}</button>)}
        </div>
        <p className="bn-reading-note">{t("reading.historyNote")}</p>
      </div> : <button className="bn-reading-button" type="button" onClick={() => setTab("account")}><AppIcon name="lock" size={16} />{t("reading.benefitLibrary")}</button>)}

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
          {filtered.length === 0 && <div role="status"><p>{t("reading.noMatches")}</p><button type="button" className="bn-reading-button" onClick={() => { setSearch(""); setCategory("all"); setStatus("all"); }}>{t("reading.clearFilters")}</button></div>}
          {filtered.map(story => (
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
              readIds={readIds}
              onToggleRead={onToggleRead}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default SavedTab;
