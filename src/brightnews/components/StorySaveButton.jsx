const StorySaveButton = ({ storyId, saved, toggleSave, variant = "inline", t }) => (
  <button
    type="button"
    onClick={event => toggleSave(storyId, event)}
    className={`bn-save-button bn-save-button--${variant}`}
    aria-label={saved.includes(storyId) ? t("story.removeSaved") : t("story.save")}
  >
    {saved.includes(storyId) ? "❤️" : "🤍"}
  </button>
);

export default StorySaveButton;
