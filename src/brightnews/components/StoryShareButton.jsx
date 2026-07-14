import StoryActionIcon from "./StoryActionIcon";

const StoryShareButton = ({ story, handleShareStory, variant = "inline" }) => (
  <button
    type="button"
    onClick={event => handleShareStory(story, event)}
    className={`bn-share-button bn-share-button--${variant}`}
    aria-label="Share story"
    title="Share story"
  >
    <StoryActionIcon name="share" />
  </button>
);

export default StoryShareButton;
