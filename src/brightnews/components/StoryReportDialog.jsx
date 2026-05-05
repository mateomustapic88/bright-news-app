import DialogOverlay from "./DialogOverlay";

const REPORT_REASONS = [
  "negative_scary",
  "political",
  "violence_crime",
  "misleading_category",
  "other",
];

const StoryReportDialog = ({ story, onClose, onSubmit, reporting, t }) => {
  if (!story) return null;

  return (
    <DialogOverlay ariaLabelledBy="bn-report-dialog-title" surfaceClassName="bn-report-dialog">
      <div className="bn-report-dialog__header">
        <div>
          <p className="bn-report-dialog__eyebrow">{t("story.reportEyebrow")}</p>
          <h2 id="bn-report-dialog-title">{t("story.reportTitle")}</h2>
        </div>
        <button
          type="button"
          className="bn-report-dialog__close"
          onClick={onClose}
          aria-label={t("story.reportClose")}
          disabled={reporting}
        >
          ×
        </button>
      </div>

      <p className="bn-report-dialog__story">{story.headline}</p>
      <p className="bn-report-dialog__description">{t("story.reportDescription")}</p>

      <div className="bn-report-dialog__reasons">
        {REPORT_REASONS.map(reason => (
          <button
            key={reason}
            type="button"
            className="bn-report-dialog__reason"
            onClick={() => onSubmit(reason)}
            disabled={reporting}
          >
            {t(`story.reportReasons.${reason}`)}
          </button>
        ))}
      </div>
    </DialogOverlay>
  );
};

export default StoryReportDialog;
