import { useState } from "react";
import { isBlockedStoryImageUrl } from "../../lib/storyImages.js";
import { getCategoryMeta } from "../constants";
import AppIcon from "./AppIcon";

const shouldSuppressStoryImage = story => isBlockedStoryImageUrl(story?.imageUrl);

const StoryMedia = ({ story, className = "", imageClassName = "", fallbackClassName = "" }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(story.imageUrl) && !imageFailed && !shouldSuppressStoryImage(story);
  const category = getCategoryMeta(story.category);
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
        <div className={`bn-story-placeholder ${fallbackClassName}`.trim()} aria-hidden="true">
          <span className="bn-story-placeholder__orb bn-story-placeholder__orb--primary" />
          <span className="bn-story-placeholder__orb bn-story-placeholder__orb--secondary" />
          <span className="bn-story-placeholder__line bn-story-placeholder__line--wide" />
          <span className="bn-story-placeholder__line bn-story-placeholder__line--short" />
          <span className="bn-story-placeholder__badge">
            <AppIcon name={category.icon} size={24} />
          </span>
        </div>
      )}
    </div>
  );
};

export default StoryMedia;
