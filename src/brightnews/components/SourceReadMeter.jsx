const SourceReadMeter = ({ sourceReadState, onUpgradeClick, requiresSignIn = false, t }) => {
  if (!sourceReadState || sourceReadState.isPremium) return null;

  const used = Math.min(sourceReadState.used || 0, sourceReadState.limit || 0);
  const limit = Math.max(1, sourceReadState.limit || 1);
  const remaining = Math.max(0, sourceReadState.remaining || 0);
  const progress = Math.min(100, (used / limit) * 100);
  const atLimit = remaining <= 0;
  const meterLabel = atLimit && requiresSignIn
    ? t("premium.sourceMeterSignIn")
    : atLimit
      ? t("premium.sourceMeterLimit")
      : t("premium.sourceMeterRemaining", { remaining, limit });

  return (
    <button
      type="button"
      className={`bn-source-meter${atLimit ? " is-limit" : ""}`}
      onClick={onUpgradeClick}
      aria-label={atLimit
        ? t("premium.sourceMeterLimitLabel")
        : t("premium.sourceMeterLabel", { remaining, limit })}
    >
      <span className="bn-source-meter__copy">
        <span className="bn-source-meter__eyebrow">{t("premium.freePlan")}</span>
        <strong>{meterLabel}</strong>
      </span>
      <span className="bn-source-meter__track" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </span>
    </button>
  );
};

export default SourceReadMeter;
