import { useState } from "react";

const StoryMedia = ({ story, className = "", imageClassName = "", fallbackClassName = "" }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(story.imageUrl) && !imageFailed;

  return (
    <div className={className}>
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
