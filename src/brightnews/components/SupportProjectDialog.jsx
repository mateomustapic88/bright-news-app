import DialogOverlay from "./DialogOverlay";

const SupportProjectDialog = ({
  open,
  onClose,
  supportPaymentUrl,
  t,
}) => {
  if (!open || !supportPaymentUrl) return null;

  return (
    <DialogOverlay ariaLabelledBy="bn-support-dialog-title" surfaceClassName="bn-support-dialog">
      <div className="bn-support-dialog__header">
        <button
          type="button"
          className="bn-report-dialog__close"
          onClick={() => onClose("close")}
          aria-label={t("supportProject.close")}
        >
          ×
        </button>
      </div>

      <div className="bn-support-dialog__copy">
        <p className="bn-premium-card__eyebrow">{t("supportProject.eyebrow")}</p>
        <h2 id="bn-support-dialog-title">{t("supportProject.modalTitle")}</h2>
        <p>{t("supportProject.modalDescription")}</p>
      </div>

      <div className="bn-support-dialog__actions">
        <a
          href={supportPaymentUrl}
          target="_blank"
          rel="noreferrer"
          className="bn-button bn-support-dialog__button bn-support-dialog__button--primary"
          onClick={() => onClose("support_click")}
        >
          {t("supportProject.cta")}
        </a>
        <button
          type="button"
          className="bn-button bn-support-dialog__button bn-support-dialog__button--secondary"
          onClick={() => onClose("not_now")}
        >
          {t("supportProject.notNow")}
        </button>
      </div>
    </DialogOverlay>
  );
};

export default SupportProjectDialog;
