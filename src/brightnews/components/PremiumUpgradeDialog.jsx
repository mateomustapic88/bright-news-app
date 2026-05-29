import { PREMIUM_PRICE_LABEL } from "../constants";
import DialogOverlay from "./DialogOverlay";

const PremiumUpgradeDialog = ({
  open,
  onClose,
  onStartPremiumPurchase,
  purchaseLoading = false,
  purchaseStatus = "",
  checkoutEnabled = true,
  readLimit,
  t,
}) => {
  if (!open) return null;

  const benefits = [
    t("premium.benefitUnlimitedSources"),
    t("premium.benefitPersonalization"),
    t("premium.benefitStrictFilter"),
    t("premium.benefitSupport"),
  ];

  return (
    <DialogOverlay ariaLabelledBy="bn-premium-dialog-title" surfaceClassName="bn-premium-dialog">
      <div className="bn-premium-dialog__header">
        <div>
          <p className="bn-premium-dialog__eyebrow">{t("premium.eyebrow")}</p>
          <h2 id="bn-premium-dialog-title">{t("premium.limitTitle")}</h2>
        </div>
        <button
          type="button"
          className="bn-report-dialog__close"
          onClick={onClose}
          aria-label={t("premium.close")}
        >
          ×
        </button>
      </div>

      <p className="bn-premium-dialog__copy">
        {t("premium.limitDescription", { limit: readLimit })}
      </p>

      <div className="bn-premium-dialog__price">
        <span>{PREMIUM_PRICE_LABEL}</span>
        <small>{t("premium.monthly")}</small>
      </div>

      <div className="bn-premium-dialog__benefits">
        {benefits.map(benefit => (
          <div key={benefit} className="bn-premium-dialog__benefit">
            <span aria-hidden="true">✓</span>
            <span>{benefit}</span>
          </div>
        ))}
      </div>

      <div className="bn-premium-dialog__actions">
        {checkoutEnabled ? (
          <button
            type="button"
            className="bn-button bn-button--primary"
            onClick={onStartPremiumPurchase}
            disabled={purchaseLoading}
          >
            {purchaseLoading ? t("premium.processing") : t("premium.choosePlan")}
          </button>
        ) : null}
        <button type="button" className="bn-button bn-button--secondary" onClick={onClose}>
          {t("premium.notNow")}
        </button>
      </div>
      <p className="bn-premium-dialog__note">
        {checkoutEnabled ? purchaseStatus || t("premium.billingNote") : t("premium.checkoutPaused")}
      </p>
    </DialogOverlay>
  );
};

export default PremiumUpgradeDialog;
