import { useState } from "react";
import { isBlockedStoryImageUrl } from "../../lib/storyImages.js";

const shouldSuppressStoryImage = story => isBlockedStoryImageUrl(story?.imageUrl);

const StoryMedia = ({ story, className = "", imageClassName = "", fallbackClassName = "" }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(story.imageUrl) && !imageFailed && !shouldSuppressStoryImage(story);
  const classes = [className, hasImage ? "has-image" : "is-placeholder"].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {hasImage ? (
        <img
          src={story.imageUrl}
          alt=""
          loading="lazy"
          className={imageClassName}
          onError={() => setImageFailed(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className={fallbackClassName}>{story.emoji}</span>
      )}
    </div>
  );
};

export default StoryMedia;
