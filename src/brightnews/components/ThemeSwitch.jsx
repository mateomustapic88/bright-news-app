const SunIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="bn-theme-switch__glyph">
    <circle cx="12" cy="12" r="4" fill="currentColor" />
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="2.5" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="21.5" />
      <line x1="2.5" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="21.5" y2="12" />
      <line x1="5.2" y1="5.2" x2="6.9" y2="6.9" />
      <line x1="17.1" y1="17.1" x2="18.8" y2="18.8" />
      <line x1="5.2" y1="18.8" x2="6.9" y2="17.1" />
      <line x1="17.1" y1="6.9" x2="18.8" y2="5.2" />
    </g>
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="bn-theme-switch__glyph">
    <path
      d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"
      fill="currentColor"
    />
  </svg>
);

const ThemeSwitch = ({ resolvedTheme = "light", onToggle, lightLabel, darkLabel }) => {
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? lightLabel : darkLabel}
      className="bn-theme-switch"
      onClick={onToggle}
      data-theme-state={resolvedTheme}
    >
      <span className="bn-theme-switch__option bn-theme-switch__option--light" aria-hidden="true">
        <SunIcon />
      </span>
      <span className="bn-theme-switch__option bn-theme-switch__option--dark" aria-hidden="true">
        <MoonIcon />
      </span>
      <span className="bn-theme-switch__thumb" aria-hidden="true" />
    </button>
  );
};

export default ThemeSwitch;
