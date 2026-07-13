import { getRegionContinentGroups } from "../constants";
import { getRegionLabel } from "../i18n";
import AppIcon from "../components/AppIcon";

const DiscoverTab = ({ region, regions, setRegion, setTab, t, uiLanguage }) => {
  const continentGroups = getRegionContinentGroups(regions);
  const worldRegion = regions.find(item => item.code === "world");

  return (
    <section className="bn-tab bn-discover-tab">
      <div className="bn-tab-heading">
        <AppIcon name="compass" size={24} />
        <h2>{t("discover.title").replace(/^[^\p{L}\p{N}]+/u, "")}</h2>
      </div>
      <p>{t("discover.description")}</p>

      <div className="bn-discover-continents">
        {worldRegion ? (
          <section className="bn-discover-continent">
            <div className="bn-region-grid bn-region-grid--world">
              <button
                type="button"
                onClick={() => {
                  setRegion("world");
                  setTab("home");
                }}
                className={`bn-discover-region${region === "world" ? " is-active" : ""}`}
              >
                <div className="bn-discover-region__flag">{worldRegion.flag}</div>
                <div className="bn-discover-region__label">{getRegionLabel("world", uiLanguage)}</div>
              </button>
            </div>
          </section>
        ) : null}

        {continentGroups.map(continent => (
          <section key={continent.id} className="bn-discover-continent">
            <div className="bn-discover-continent__header">
              <span>{continent.emoji}</span>
              <strong>{continent.label}</strong>
            </div>

            <div className="bn-region-grid">
              {continent.regions.map(item => (
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
          </section>
        ))}
      </div>

      <div className="bn-discover-note">
        <strong>{t("discover.moreCountriesTitle")}</strong>
        <span>{t("discover.moreCountriesText")}</span>
      </div>
    </section>
  );
};

export default DiscoverTab;
