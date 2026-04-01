import { getRegionLabel } from "../i18n";

const DiscoverTab = ({ region, regions, setRegion, setTab, t, uiLanguage }) => (
  <section className="bn-tab bn-discover-tab">
    <h2>{t("discover.title")}</h2>
    <p>{t("discover.description")}</p>

    <div className="bn-region-grid">
      {regions.map(item => (
        <button
          key={item.code}
          type="button"
          onClick={() => {
            setRegion(item.code);
            setTab("home");
          }}
          className={`bn-discover-region${region === item.code ? " is-active" : ""}`}
        >
          <div className="bn-discover-region__flag">{item.flag}</div>
          <div className="bn-discover-region__label">{getRegionLabel(item.code, uiLanguage)}</div>
        </button>
      ))}
    </div>

    <div className="bn-discover-note">
      <strong>{t("discover.moreCountriesTitle")}</strong>
      <span>{t("discover.moreCountriesText")}</span>
    </div>
  </section>
);

export default DiscoverTab;
