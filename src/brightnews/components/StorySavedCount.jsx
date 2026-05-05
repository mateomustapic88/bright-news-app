import { formatCompactNumber } from "../i18n";

const StorySavedCount = ({ count, t, uiLanguage }) => {
  const savedCount = Number(count || 0);

  if (savedCount <= 0) return null;

  const formattedCount = formatCompactNumber(savedCount, uiLanguage);
  const label = typeof t === "function"
    ? t("story.savedCount", { count: formattedCount })
    : `Saved ${formattedCount} ${savedCount === 1 ? "time" : "times"}`;

  return (
    <span className="bn-saved-count-pill" title={label}>
      ❤️ {label}
    </span>
  );
};

export default StorySavedCount;
