import { useState } from "react";

const getInitials = value =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("") || "BN";

const TopBar = ({ session, setTab, languageFilter, languageFilters, setLanguageFilter }) => {
  const label =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email ||
    "Account";
  const avatarUrl = session?.user?.user_metadata?.avatar_url || "";
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const currentLanguage = languageFilters.find(item => item.id === languageFilter) || languageFilters[0];

  return (
    <div className="bn-top-bar">
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
            <span>{currentLanguage?.shortLabel || "Language"}</span>
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
                  <span>{item.label}</span>
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
        <span>{session?.user ? "Account" : "Sign In"}</span>
      </button>
    </div>
  );
};

export default TopBar;
