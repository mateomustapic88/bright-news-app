import { normalizeExternalUrl } from "../../lib/urls";

const StorySourceLink = ({ sourceUrl, compact = false }) => {
  const normalizedUrl = normalizeExternalUrl(sourceUrl);
  if (!normalizedUrl) return null;

  return (
    <a
      href={normalizedUrl}
      target="_blank"
      rel="noreferrer noopener"
      onClick={event => event.stopPropagation()}
      className={`bn-source-link${compact ? " is-compact" : ""}`}
    >
      <span>🔗</span>
      <span>Read source</span>
    </a>
  );
};

export default StorySourceLink;
