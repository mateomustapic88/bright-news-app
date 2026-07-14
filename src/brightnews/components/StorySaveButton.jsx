import StoryActionIcon from "./StoryActionIcon";

const StorySaveButton = ({ storyId, saved, toggleSave, variant = "inline", t }) => (
  <button
    type="button"
    onClick={event => toggleSave(storyId, event)}
    className={`bn-save-button bn-save-button--${variant}${saved.includes(storyId) ? " is-saved" : ""}`}
    aria-label={saved.includes(storyId) ? t("story.removeSaved") : t("story.save")}
  >
    <StoryActionIcon name="heart" active={saved.includes(storyId)} />
  </button>
);

export default StorySaveButton;
