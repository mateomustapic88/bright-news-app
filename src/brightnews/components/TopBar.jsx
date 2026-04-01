import { useState } from "react";
import { getLanguageLabel, getLanguageShortLabel } from "../i18n";

const getInitials = value =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("") || "BN";

const TopBar = ({
  session,
  tab,
  tabs,
  setTab,
  languageFilter,
  languageFilters,
  setLanguageFilter,
  t,
  uiLanguage,
}) => {
  const label =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email ||
    t("topbar.account");
  const avatarUrl = session?.user?.user_metadata?.avatar_url || "";
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const currentLanguage = languageFilters.find(item => item.id === languageFilter) || languageFilters[0];

  return (
    <div className="bn-top-bar">
      <button type="button" className="bn-top-bar__brand" onClick={() => setTab("home")}>
        <span className="bn-top-bar__brand-mark">☀️</span>
        <span className="bn-top-bar__brand-name">BrightNews</span>
      </button>

      <nav className="bn-desktop-nav" aria-label="Primary">
        {tabs.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`bn-desktop-nav__item${tab === item.id ? " is-active" : ""}`}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="bn-top-bar__controls">
        {languageFilters.length > 1 ? (
          <div className="bn-language-menu">
            <button
              type="button"
              className="bn-language-button"
              onClick={() => setIsLanguageMenuOpen(open => !open)}
              aria-haspopup="menu"
              aria-expanded={isLanguageMenuOpen}
            >
              <span>{currentLanguage?.emoji || "🌐"}</span>
              <span>{currentLanguage ? getLanguageShortLabel(currentLanguage.id, uiLanguage) : t("topbar.language")}</span>
            </button>

            {isLanguageMenuOpen ? (
              <div className="bn-language-menu__panel" role="menu">
                {languageFilters.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={`bn-language-menu__item${languageFilter === item.id ? " is-active" : ""}`}
                    onClick={() => {
                      setLanguageFilter(item.id);
                      setIsLanguageMenuOpen(false);
                    }}
                    role="menuitemradio"
                    aria-checked={languageFilter === item.id}
                  >
                    <span>{item.emoji}</span>
                    <span>{getLanguageLabel(item.id, uiLanguage)}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <button type="button" onClick={() => setTab("account")} className="bn-account-button">
          <span className="bn-account-button__icon">
            {session?.user ? (
              avatarUrl ? (
                <img src={avatarUrl} alt="" className="bn-account-button__avatar" referrerPolicy="no-referrer" />
              ) : (
                <span className="bn-account-button__avatar bn-account-button__avatar--fallback">
                  {getInitials(label)}
                </span>
              )
            ) : "🔐"}
          </span>
          <span>{session?.user ? t("topbar.account") : t("topbar.signIn")}</span>
        </button>
      </div>
    </div>
  );
};

export default TopBar;
