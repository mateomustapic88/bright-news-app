import { normalizeExternalUrl } from "../../lib/urls";
import StoryActionIcon from "./StoryActionIcon";

const StorySourceLink = ({
  story,
  sourceUrl,
  compact = false,
  label = "Read source",
  sourceReadState,
  onReadSource,
}) => {
  const normalizedUrl = normalizeExternalUrl(sourceUrl);
  if (!normalizedUrl) return null;

  const helper = sourceReadState?.isPremium
    ? sourceReadState.premiumLabel
    : sourceReadState?.remainingLabel;

  const handleClick = event => {
    event.stopPropagation();

    if (!onReadSource) return;

    event.preventDefault();
    onReadSource(story, normalizedUrl, event);
  };

  return (
    <a
      href={normalizedUrl}
      target="_blank"
      rel="noreferrer noopener"
      onClick={handleClick}
      className={`bn-source-link${compact ? " is-compact" : ""}`}
    >
      <StoryActionIcon name="source" className="bn-source-link__icon" />
      <span>{label}</span>
      {helper ? <span className="bn-source-link__helper">{helper}</span> : null}
    </a>
  );
};

export default StorySourceLink;
