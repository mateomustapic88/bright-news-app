import { useState } from "react";
import { isBlockedStoryImageUrl } from "../../lib/storyImages.js";
import { getCategoryMeta } from "../constants";
import AppIcon from "./AppIcon";

const CATEGORY_PLACEHOLDER_IMAGES = {
  Environment: "/images/placeholders/planet.jpg",
  Science: "/images/placeholders/science.jpg",
  Community: "/images/placeholders/people.jpg",
  Health: "/images/placeholders/health.jpg",
  Animals: "/images/placeholders/animals.jpg",
  Sports: "/images/placeholders/sports.jpg",
  Innovation: [
    "/images/placeholders/tech.jpg",
    "/images/placeholders/tech-1.jpg",
    "/images/placeholders/tech-2.jpg",
  ],
};

const DEFAULT_PLACEHOLDER_IMAGE = "/images/placeholders/positive-news.jpg";

const shouldSuppressStoryImage = story => isBlockedStoryImageUrl(story?.imageUrl);

const getStablePlaceholderIndex = (story, imageCount) => {
  if (imageCount <= 1) return 0;

  const stableValue = String(story?.id || story?.sourceUrl || story?.headline || "");
  let hash = 0;

  for (let index = 0; index < stableValue.length; index += 1) {
    hash = ((hash << 5) - hash) + stableValue.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash) % imageCount;
};

const getPlaceholderImage = story => {
  const configuredImage = CATEGORY_PLACEHOLDER_IMAGES[story.category] || DEFAULT_PLACEHOLDER_IMAGE;

  if (!Array.isArray(configuredImage)) return configuredImage;

  return configuredImage[getStablePlaceholderIndex(story, configuredImage.length)] || configuredImage[0];
};

const StoryMedia = ({ story, className = "", imageClassName = "", fallbackClassName = "" }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const [placeholderFailed, setPlaceholderFailed] = useState(false);
  const hasImage = Boolean(story.imageUrl) && !imageFailed && !shouldSuppressStoryImage(story);
  const category = getCategoryMeta(story.category);
  const placeholderImage = getPlaceholderImage(story);
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
      ) : !placeholderFailed ? (
        <img
          src={placeholderImage}
          alt=""
          loading="lazy"
          className={imageClassName}
          onError={() => setPlaceholderFailed(true)}
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
