const Header = ({ region, regions, setRegion, onRefresh }) => {
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <header className="bn-header">
      <div className="bn-header__row">
        <div className="bn-brand">
          <div className="bn-brand__icon">☀️</div>
          <div>
            <div className="bn-brand__name">BrightNews</div>
            <p className="bn-brand__meta">Good news only · {todayLabel}</p>
          </div>
        </div>

        <button type="button" onClick={onRefresh} className="bn-refresh-button" aria-label="Refresh stories">
          🔄
        </button>
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
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
};

export default Header;
