import { formatCompactNumber } from "../i18n";
import StoryActionIcon from "./StoryActionIcon";

const StorySavedCount = ({ count, t, uiLanguage }) => {
  const savedCount = Number(count || 0);

  if (savedCount <= 0) return null;

  const formattedCount = formatCompactNumber(savedCount, uiLanguage);
  const label = typeof t === "function"
    ? t("story.savedCount", { count: formattedCount })
    : `Saved ${formattedCount} ${savedCount === 1 ? "time" : "times"}`;

  return (
    <span className="bn-saved-count-pill" title={label}>
      <StoryActionIcon name="heart" active className="bn-saved-count-pill__icon" />
      {label}
    </span>
  );
};

export default StorySavedCount;
