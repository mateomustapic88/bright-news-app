const StoryReportButton = ({ story, onReportStory, variant = "inline", t }) => (
  <button
    type="button"
    onClick={event => {
      event.stopPropagation();
      onReportStory?.(story, event);
    }}
    className={`bn-report-button bn-report-button--${variant}`}
    aria-label={t("story.reportNotPositive")}
    title={t("story.reportNotPositive")}
  >
    {t("story.reportNotPositive")}
  </button>
);

export default StoryReportButton;
