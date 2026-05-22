import { useMemo, useState } from "react";
import { getContinentIdForRegionCode, getRegionContinentGroups } from "../constants";
import { formatUiDate, getRegionLabel } from "../i18n";
import BrandMark from "./BrandMark";

const Header = ({
  region,
  regions,
  setRegion,
  onRefresh,
  refreshing = false,
  feedbackHref,
  onFeedbackClick,
  showRegions = true,
  hideFeedChrome = false,
  t,
  uiLanguage,
}) => {
  const todayLabel = formatUiDate(new Date(), uiLanguage);
  const [isRegionPickerOpen, setIsRegionPickerOpen] = useState(false);
  const [activeContinentId, setActiveContinentId] = useState(null);
  const continentGroups = useMemo(() => getRegionContinentGroups(regions), [regions]);
  const visibleContinentId = region === "world"
    ? activeContinentId
    : getContinentIdForRegionCode(region);
  const activeContinent = continentGroups.find(item => item.id === visibleContinentId) || null;
  const worldRegion = regions.find(item => item.code === "world");
  const currentRegion = regions.find(item => item.code === region) || regions[0];
  const currentRegionLabel = getRegionLabel(region, uiLanguage);

  return (
    <header className={`bn-header${hideFeedChrome ? " is-feed-chrome-hidden" : ""}`}>
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
          <div className="bn-brand__icon">
            <BrandMark />
          </div>
          <div>
            <div className="bn-brand__name">BrightNews</div>
            <p className="bn-brand__meta">{t("header.meta", { date: todayLabel })}</p>
          </div>
        </div>

        <div className="bn-header__actions">
          <a className="bn-header__feedback" href={feedbackHref} onClick={onFeedbackClick}>
            {t("header.betaFeedback")}
          </a>
          <button
            type="button"
            onClick={onRefresh}
            className={`bn-refresh-button${refreshing ? " is-loading" : ""}`}
            aria-label={t("header.refreshStories")}
            aria-busy={refreshing}
            disabled={refreshing}
          >
            <span className="bn-refresh-button__icon" aria-hidden="true">
              {refreshing ? (
                <span className="bn-refresh-button__spinner" />
              ) : (
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 10a6 6 0 1 1-1.76-4.24" />
                  <path d="M16 4v4h-4" />
                </svg>
              )}
            </span>
            <span className="bn-refresh-button__label">{t("header.refreshStories")}</span>
          </button>
        </div>
      </div>

      <div className="bn-header__divider" aria-hidden="true" />

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
              <span className="bn-globe-selector__icon" aria-hidden="true">
                <span className="bn-globe-selector__glyph">{currentRegion?.flag || "🌍"}</span>
              </span>
              <span className="bn-globe-selector__copy">
                <strong>{currentRegionLabel}</strong>
                <span>Switch country coverage</span>
              </span>
              <span className="bn-globe-selector__chevron" aria-hidden="true">
                <span className="bn-globe-selector__chevron-line bn-globe-selector__chevron-line--horizontal" />
                <span className="bn-globe-selector__chevron-line bn-globe-selector__chevron-line--vertical" />
              </span>
            </button>

            {isRegionPickerOpen ? (
              <div className="bn-globe-selector__panel" role="dialog" aria-label={t("header.edition")}>
                <div className="bn-globe-selector__continents" role="tablist" aria-label="Continents">
                  {worldRegion ? (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={region === "world" && !activeContinent}
                      onClick={() => {
                        setRegion("world");
                        setActiveContinentId(null);
                        setIsRegionPickerOpen(false);
                      }}
                      className={`bn-globe-selector__continent${region === "world" && !activeContinent ? " is-active" : ""}`}
                    >
                      <span>{worldRegion.flag}</span>
                      <span>{getRegionLabel("world", uiLanguage)}</span>
                    </button>
                  ) : null}

                  {continentGroups.map(continent => (
                    <button
                      key={continent.id}
                      type="button"
                      role="tab"
                      aria-selected={activeContinent?.id === continent.id}
                      onClick={() => setActiveContinentId(continent.id)}
                      className={`bn-globe-selector__continent${activeContinent?.id === continent.id ? " is-active" : ""}`}
                    >
                      <span>{continent.emoji}</span>
                      <span>{continent.label}</span>
                    </button>
                  ))}
                </div>

                <div className="bn-globe-selector__countries">
                  {activeContinent ? activeContinent.regions.map(item => (
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
                  )) : (
                    <p className="bn-globe-selector__hint">Choose a continent to see countries.</p>
                  )}
                </div>
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
