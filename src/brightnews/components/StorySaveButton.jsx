const StorySaveButton = ({ storyId, saved, toggleSave, variant = "inline" }) => (
  <button
    type="button"
    onClick={event => toggleSave(storyId, event)}
    className={`bn-save-button bn-save-button--${variant}`}
    aria-label={saved.includes(storyId) ? "Remove saved story" : "Save story"}
  >
    {saved.includes(storyId) ? "❤️" : "🤍"}
  </button>
);

export default StorySaveButton;
