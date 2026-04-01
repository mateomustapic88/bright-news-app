import { formatUiDate, getRegionLabel } from "../i18n";

const Header = ({
  region,
  regions,
  setRegion,
  onRefresh,
  feedbackHref,
  onFeedbackClick,
  showRegions = true,
  t,
  uiLanguage,
}) => {
  const todayLabel = formatUiDate(new Date(), uiLanguage);

  return (
    <header className="bn-header">
      <div className="bn-header__row">
        <div className="bn-brand">
          <div>
            <div className="bn-brand__eyebrow">{t("header.eyebrow")}</div>
            <div className="bn-brand__name">{t("header.title")}</div>
            <p className="bn-brand__meta">{t("header.meta", { date: todayLabel })}</p>
            <p className="bn-brand__lede">
              {t("header.lede")}
            </p>
          </div>
        </div>

        <div className="bn-header__actions">
          <a className="bn-header__feedback" href={feedbackHref} onClick={onFeedbackClick}>
            {t("header.betaFeedback")}
          </a>
          <button type="button" onClick={onRefresh} className="bn-refresh-button" aria-label={t("header.refreshStories")}>
            🔄
          </button>
        </div>
      </div>

      {showRegions ? (
        <div className="bn-region-context">
          <span className="bn-region-context__label">{t("header.edition")}</span>
          <div className="bn-region-row">
            {regions.map(item => (
              <button
                key={item.code}
                type="button"
                onClick={() => setRegion(item.code)}
                className={`bn-region-button${region === item.code ? " is-active" : ""}`}
              >
                <span className="bn-region-button__flag">{item.flag}</span>
                <span>{getRegionLabel(item.code, uiLanguage)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
};

export default Header;
