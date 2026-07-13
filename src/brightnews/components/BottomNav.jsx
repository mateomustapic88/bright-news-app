import AppIcon from "./AppIcon";

const BottomNav = ({ tabs, tab, setTab }) => (
  <nav className="bn-bottom-nav" aria-label="Primary" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
    {tabs.map(item => (
      <button
        key={item.id}
        type="button"
        onClick={() => setTab(item.id)}
        className={`bn-bottom-nav__item${tab === item.id ? " is-active" : ""}`}
      >
        <span className="bn-bottom-nav__icon">
          <AppIcon name={item.id} size={22} strokeWidth={tab === item.id ? 2.35 : 1.85} />
        </span>
        <span className="bn-bottom-nav__label">{item.label}</span>
      </button>
    ))}
  </nav>
);

export default BottomNav;
