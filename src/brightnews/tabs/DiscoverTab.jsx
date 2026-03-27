const DiscoverTab = ({ region, regions, setRegion, setTab }) => (
  <section className="bn-tab bn-discover-tab">
    <h2>🌍 Explore Regions</h2>
    <p>Tap any region to explore its good news</p>

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
          <div className="bn-discover-region__label">{item.label}</div>
        </button>
      ))}
    </div>
  </section>
);

export default DiscoverTab;
