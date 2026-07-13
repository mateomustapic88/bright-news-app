import AppIcon from "./AppIcon";

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
      title={isDark ? lightLabel : darkLabel}
    >
      <AppIcon name={isDark ? "sun" : "moon"} size={18} />
    </button>
  );
};

export default ThemeSwitch;
