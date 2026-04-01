import { useState } from "react";
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
  const [isRegionPickerOpen, setIsRegionPickerOpen] = useState(false);
  const currentRegion = regions.find(item => item.code === region) || regions[0];
  const currentRegionLabel = getRegionLabel(region, uiLanguage);

  return (
    <header className="bn-header">
      <div className="bn-header__row">
        <div className="bn-brand bn-brand--desktop">
          <div>
            <div className="bn-brand__eyebrow">{t("header.eyebrow")}</div>
            <div className="bn-brand__name">{t("header.title")}</div>
            <p className="bn-brand__meta">{t("header.meta", { date: todayLabel })}</p>
            <p className="bn-brand__lede">
              {t("header.lede")}
            </p>
          </div>
        </div>

        <div className="bn-brand bn-brand--mobile">
          <div className="bn-brand__icon">☀️</div>
          <div>
            <div className="bn-brand__name">BrightNews</div>
            <p className="bn-brand__meta">{t("header.meta", { date: todayLabel })}</p>
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
          <div className="bn-region-context__desktop">
            <button
              type="button"
              className={`bn-globe-selector${isRegionPickerOpen ? " is-open" : ""}`}
              onClick={() => setIsRegionPickerOpen(open => !open)}
              aria-expanded={isRegionPickerOpen}
              aria-haspopup="dialog"
            >
              <span className="bn-globe-selector__icon" aria-hidden="true">{currentRegion?.flag || "🌍"}</span>
              <span className="bn-globe-selector__copy">
                <strong>{currentRegionLabel}</strong>
                <span>Switch country coverage</span>
              </span>
              <span className="bn-globe-selector__chevron" aria-hidden="true">
                {isRegionPickerOpen ? "−" : "+"}
              </span>
            </button>

            {isRegionPickerOpen ? (
              <div className="bn-globe-selector__panel" role="dialog" aria-label={t("header.edition")}>
                {regions.map(item => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      setRegion(item.code);
                      setIsRegionPickerOpen(false);
                    }}
                    className={`bn-globe-selector__option${region === item.code ? " is-active" : ""}`}
                  >
                    <span>{item.flag}</span>
                    <span>{getRegionLabel(item.code, uiLanguage)}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
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
