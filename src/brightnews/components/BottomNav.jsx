const BottomNav = ({ tabs, tab, setTab }) => (
  <nav className="bn-bottom-nav" aria-label="Primary">
    {tabs.map(item => (
      <button
        key={item.id}
        type="button"
        onClick={() => setTab(item.id)}
        className={`bn-bottom-nav__item${tab === item.id ? " is-active" : ""}`}
      >
        <span className="bn-bottom-nav__icon">{item.emoji}</span>
        <span className="bn-bottom-nav__label">{item.label.toUpperCase()}</span>
        {tab === item.id && <span className="bn-bottom-nav__indicator" aria-hidden="true" />}
      </button>
    ))}
  </nav>
);

export default BottomNav;
