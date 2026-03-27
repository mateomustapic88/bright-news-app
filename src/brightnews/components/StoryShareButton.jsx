const StoryShareButton = ({ story, handleShareStory, variant = "inline" }) => (
  <button
    type="button"
    onClick={event => handleShareStory(story, event)}
    className={`bn-share-button bn-share-button--${variant}`}
    aria-label="Share story"
    title="Share story"
  >
    <svg
      className="bn-share-button__icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.65 10.75 15.35 6.25" />
      <path d="M8.65 13.25 15.35 17.75" />
    </svg>
  </button>
);

export default StoryShareButton;
