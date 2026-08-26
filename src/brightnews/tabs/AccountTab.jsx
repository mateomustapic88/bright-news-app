import { useState } from "react";
import AuthPanel from "../components/AuthPanel";
import { CATEGORIES, FREE_SOURCE_READ_LIMIT, PREMIUM_PRICE_LABEL, isPremiumProfile } from "../constants";
import { getCategoryLabel, getLanguageLabel, getRegionLabel } from "../i18n";
import AppIcon from "../components/AppIcon";
import {
  buildFeedbackMailto,
  LEGAL_LINKS,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO,
} from "../../lib/appConfig";

const getInitials = value =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("") || "BN";

const AccountTab = ({
  session,
  profile,
  profileLoading,
  authLoading,
  authMessage,
  authError,
  syncingSaved,
  sourceReadState,
  regions,
  userPreferences,
  handleConfirmPersonalization,
  personalizationSaving = false,
  handleStartPremiumPurchase,
  handleRestorePremiumPurchase,
  premiumPurchaseLoading = false,
  premiumPurchaseFeedback = null,
  premiumCheckoutEnabled = true,
  supportPaymentUrl = "",
  showSupportCard = false,
  appVersionLabel = "",
  handleGoogleSignIn,
  handleEmailAuth,
  handleSignOut,
  handleFeedbackClick,
  t,
  uiLanguage,
  themePreference = "light",
  setThemePreference,
  appLanguage,
  appLanguages = [],
  setAppLanguage,
}) => {
  const feedbackMailto = buildFeedbackMailto();
  const displayName =
    profile?.display_name ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email ||
    t("auth.defaultReader");
  const accountEmail = session?.user?.email || "";
  const avatarUrl = session?.user?.user_metadata?.avatar_url || "";
  const isPremium = isPremiumProfile(profile);
  const isSignedIn = Boolean(session?.user);
  const planLabel = isPremium ? t("premium.planPremium") : t("premium.planFree");
  const [draftPreferences, setDraftPreferences] = useState(userPreferences || {});
  const [openSettingsMenu, setOpenSettingsMenu] = useState(null);
  const preferredRegions = draftPreferences?.preferredRegions || [];
  const preferredCategories = draftPreferences?.preferredCategories || [];
  const strictPositiveFilter = Boolean(draftPreferences?.strictPositiveFilter);
  const hideSavedStories = Boolean(draftPreferences?.hideSavedStories);
  const hasDraftPreferences =
    preferredRegions.length > 0 ||
    preferredCategories.length > 0 ||
    strictPositiveFilter ||
    hideSavedStories;
  const preferencesChanged =
    JSON.stringify(draftPreferences || {}) !== JSON.stringify(userPreferences || {});
  const themeOptions = [
    { id: "system", label: t("topbar.themeSystem") },
    { id: "light", label: t("topbar.themeLight") },
    { id: "dark", label: t("topbar.themeDark") },
  ];
  const currentThemeOption = themeOptions.find(item => item.id === themePreference) || themeOptions[0];
  const currentLanguage = appLanguages.find(item => item.id === appLanguage) || appLanguages[0];

  const togglePreference = (field, value) => {
    const current = field === "preferredRegions" ? preferredRegions : preferredCategories;
    const next = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];
    setDraftPreferences(currentPreferences => ({
      ...currentPreferences,
      [field]: next,
    }));
  };

  const renderSettingsMenu = ({ id, value, label, options, onChange }) => {
    const isOpen = openSettingsMenu === id;

    return (
      <div className={`bn-account-select${isOpen ? " is-open" : ""}`}>
        <button
          type="button"
          className="bn-account-select__button"
          onClick={() => setOpenSettingsMenu(current => (current === id ? null : id))}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <span>{label}</span>
          <AppIcon name="chevronDown" size={16} />
        </button>

        {isOpen ? (
          <div className="bn-account-select__menu" role="menu">
            {options.map(item => (
              <button
                key={item.id}
                type="button"
                className={`bn-account-select__item${item.id === value ? " is-active" : ""}`}
                onClick={() => {
                  onChange?.(item.id);
                  setOpenSettingsMenu(null);
                }}
                role="menuitemradio"
                aria-checked={item.id === value}
              >
                {item.emoji ? <span className="bn-account-select__emoji">{item.emoji}</span> : null}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const accountFooter = (
    <footer className="bn-account-footer">
      <div className="bn-account-footer__links">
        <a href={feedbackMailto} onClick={handleFeedbackClick} className="bn-account-footer__link">
          {t("account.sendBetaFeedback")}
        </a>
        <span aria-hidden="true" className="bn-account-footer__dot">·</span>
        <a href={LEGAL_LINKS.support} target="_blank" rel="noreferrer" className="bn-account-footer__link">
          {t("account.support")}
        </a>
        <span aria-hidden="true" className="bn-account-footer__dot">·</span>
        <a href={LEGAL_LINKS.privacy} target="_blank" rel="noreferrer" className="bn-account-footer__link">
          {t("account.privacyPolicy")}
        </a>
        <span aria-hidden="true" className="bn-account-footer__dot">·</span>
        <a
          href={LEGAL_LINKS.deletion}
          target="_blank"
          rel="noreferrer"
          className="bn-account-footer__link bn-account-footer__link--danger"
        >
          {t("account.accountDeletion")}
        </a>
      </div>
      <p className="bn-account-footer__hint">
        {t("account.supportEmail")} <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>
      </p>
      {appVersionLabel ? (
        <p className="bn-account-footer__version">
          {t("account.appVersion", { version: appVersionLabel })}
        </p>
      ) : null}
    </footer>
  );

  if (!isSignedIn) {
    return (
      <section className="bn-tab bn-account-tab">
        <header className="bn-account-page-header">
          <p>{t("account.resourcesTitle")}</p>
          <h2>{t("account.signedOutTitle").replace(/^[^\p{L}\p{N}]+/u, "")}</h2>
        </header>

        <AuthPanel
          session={session}
          profile={profile}
          profileLoading={profileLoading}
          authLoading={authLoading}
          authMessage={authMessage}
          authError={authError}
          syncingSaved={syncingSaved}
          handleSignOut={handleSignOut}
          handleGoogleSignIn={handleGoogleSignIn}
          handleEmailAuth={handleEmailAuth}
          t={t}
        />

        {syncingSaved && <p className="bn-feedback bn-feedback--accent">{t("auth.syncingSaved")}</p>}
        {authMessage && <p className="bn-feedback bn-feedback--info">{authMessage}</p>}
        {authError && <p className="bn-feedback bn-feedback--error">{authError}</p>}

        {accountFooter}
      </section>
    );
  }

  return (
    <section className="bn-tab bn-account-tab">
      <header className="bn-account-page-header">
        <p>{t("account.resourcesTitle")}</p>
        <h2>{t(session?.user ? "account.signedInTitle" : "account.signedOutTitle").replace(/^[^\p{L}\p{N}]+/u, "")}</h2>
      </header>

      {session?.user ? (
        <section className="bn-account-card bn-account-card--identity">
          <div className="bn-account-identity">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="bn-account-identity__avatar" referrerPolicy="no-referrer" />
            ) : (
              <div className="bn-account-identity__avatar bn-account-identity__avatar--fallback">
                {getInitials(displayName)}
              </div>
            )}
            <div className="bn-account-identity__copy">
              <p className="bn-account-identity__name">
                {profileLoading ? t("auth.loadingAccount") : displayName}
              </p>
              {accountEmail ? <p className="bn-account-identity__email">{accountEmail}</p> : null}
              <p className="bn-account-identity__plan">{t("auth.plan", { plan: planLabel })}</p>
            </div>
          </div>
          <button type="button" onClick={handleSignOut} className="bn-button bn-button--secondary">
            <AppIcon name="logout" size={17} />
            {t("auth.signOut")}
          </button>
        </section>
      ) : (
        <AuthPanel
          session={session}
          profile={profile}
          profileLoading={profileLoading}
          authLoading={authLoading}
          authMessage={authMessage}
          authError={authError}
          syncingSaved={syncingSaved}
          handleSignOut={handleSignOut}
          handleGoogleSignIn={handleGoogleSignIn}
          handleEmailAuth={handleEmailAuth}
          t={t}
        />
      )}

      {syncingSaved && <p className="bn-feedback bn-feedback--accent">{t("auth.syncingSaved")}</p>}
      {authMessage && <p className="bn-feedback bn-feedback--info">{authMessage}</p>}
      {authError && <p className="bn-feedback bn-feedback--error">{authError}</p>}

      <section className={`bn-account-card bn-premium-card${isPremium ? " is-premium" : ""}`}>
        <div className="bn-premium-card__header">
          <div>
            <p className="bn-premium-card__eyebrow"><AppIcon name="crown" size={16} /> {t("premium.eyebrow")}</p>
            <h2>{isPremium ? t("premium.accountTitlePremium") : t("premium.accountTitleFree")}</h2>
          </div>
          <span className="bn-premium-card__price">{PREMIUM_PRICE_LABEL}</span>
        </div>

        <p className="bn-premium-card__description">
          {isPremium
            ? t("premium.accountDescriptionPremium")
            : t("premium.accountDescriptionFree", { limit: FREE_SOURCE_READ_LIMIT })}
        </p>

        <div className="bn-premium-card__meter">
          <div>
            <span>{t("premium.sourceReadsToday")}</span>
            <strong>
              {isPremium
                ? t("premium.unlimited")
                : `${sourceReadState?.remaining ?? FREE_SOURCE_READ_LIMIT}/${FREE_SOURCE_READ_LIMIT}`}
            </strong>
          </div>
          {!isPremium ? (
            <div className="bn-premium-card__meter-track" aria-hidden="true">
              <span
                style={{
                  width: `${Math.min(100, ((sourceReadState?.used || 0) / FREE_SOURCE_READ_LIMIT) * 100)}%`,
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="bn-premium-card__features">
          <span><AppIcon name="shield" size={16} /> {t("premium.benefitUnlimitedSources")}</span>
          <span><AppIcon name="settings" size={16} /> {t("premium.benefitPersonalization")}</span>
          <span><AppIcon name="filter" size={16} /> {t("premium.benefitStrictFilter")}</span>
          <span><AppIcon name="sparkles" size={16} /> {t("premium.benefitFreshFeed")}</span>
        </div>

        {isPremium ? (
          <p className="bn-premium-card__status">{t("premium.active")}</p>
        ) : !premiumCheckoutEnabled ? (
          <p className="bn-premium-card__feedback bn-premium-card__feedback--info">
            {t("premium.checkoutPaused")}
          </p>
        ) : (
          <>
            <button
              type="button"
              className="bn-button bn-button--primary"
              onClick={handleStartPremiumPurchase}
              disabled={premiumPurchaseLoading}
            >
              {premiumPurchaseLoading ? t("premium.processing") : t("premium.choosePlan")}
            </button>
            {handleRestorePremiumPurchase ? (
              <button
                type="button"
                className="bn-button bn-button--secondary"
                onClick={() => handleRestorePremiumPurchase()}
                disabled={premiumPurchaseLoading}
              >
                {premiumPurchaseLoading ? t("premium.processing") : t("premium.restorePurchase")}
              </button>
            ) : null}
            {premiumPurchaseFeedback ? (
              <p className={`bn-premium-card__feedback bn-premium-card__feedback--${premiumPurchaseFeedback.variant || "info"}`}>
                {premiumPurchaseFeedback.message}
              </p>
            ) : null}
          </>
        )}
      </section>

      {showSupportCard && supportPaymentUrl ? (
        <section className="bn-account-card bn-support-card">
          <div className="bn-support-card__copy">
            <p className="bn-premium-card__eyebrow"><AppIcon name="heart" size={16} /> {t("supportProject.eyebrow")}</p>
            <h2>{t("supportProject.title")}</h2>
            <p>{t("supportProject.description")}</p>
          </div>
          <a
            href={supportPaymentUrl}
            target="_blank"
            rel="noreferrer"
            className="bn-button bn-button--secondary bn-support-card__button"
          >
            {t("supportProject.cta")}
          </a>
        </section>
      ) : null}

      <section className="bn-account-settings" aria-labelledby="bn-account-settings-title">
        <div className="bn-account-settings__header">
          <p>{t("premium.personalizationEyebrow")}</p>
          <h2 id="bn-account-settings-title">{t("topbar.language")} &amp; {t("topbar.themeSystem")}</h2>
        </div>

        <div className="bn-account-setting-row">
          <span className="bn-account-setting-row__icon"><AppIcon name="moon" size={20} /></span>
          <span className="bn-account-setting-row__copy">
            <strong>{t("topbar.themeLight").replace(/\s+theme$/i, "")}</strong>
            <small>{t(`topbar.theme${themePreference === "dark" ? "Dark" : themePreference === "light" ? "Light" : "System"}`)}</small>
          </span>
          {renderSettingsMenu({
            id: "theme",
            value: themePreference,
            label: currentThemeOption.label,
            options: themeOptions,
            onChange: setThemePreference,
          })}
        </div>

        {appLanguages.length > 1 ? (
          <div className="bn-account-setting-row">
            <span className="bn-account-setting-row__icon"><AppIcon name="language" size={20} /></span>
            <span className="bn-account-setting-row__copy">
              <strong>{t("topbar.language")}</strong>
              <small>{getLanguageLabel(appLanguage, uiLanguage)}</small>
            </span>
            {renderSettingsMenu({
              id: "language",
              value: appLanguage,
              label: currentLanguage ? getLanguageLabel(currentLanguage.id, uiLanguage) : t("topbar.language"),
              options: appLanguages.map(item => ({
                id: item.id,
                label: getLanguageLabel(item.id, uiLanguage),
                emoji: item.emoji,
              })),
              onChange: setAppLanguage,
            })}
          </div>
        ) : null}
      </section>

      <section className={`bn-account-card bn-personalization-card${!isPremium ? " is-locked" : ""}`}>
        <div className="bn-personalization-card__header">
          <div>
            <p className="bn-premium-card__eyebrow">{t("premium.personalizationEyebrow")}</p>
            <h2>{t("premium.personalizationTitle")}</h2>
          </div>
          {!isPremium ? (
            <span className="bn-personalization-card__lock">
              <AppIcon name="lock" size={14} />
              {t("premium.premiumOnly")}
            </span>
          ) : null}
        </div>

        <p className="bn-premium-card__description">{t("premium.personalizationDescription")}</p>

        {!isPremium ? (
          <div className="bn-personalization-card__locked-notice" role="note">
            <span className="bn-personalization-card__locked-icon"><AppIcon name="lock" size={20} /></span>
            <span>
              <strong>{t("premium.personalizationLockedTitle")}</strong>
              <small>{t("premium.personalizationLockedDescription")}</small>
            </span>
            <button
              type="button"
              className="bn-button bn-button--primary"
              onClick={handleStartPremiumPurchase}
              disabled={premiumPurchaseLoading || !premiumCheckoutEnabled}
            >
              {premiumPurchaseLoading ? t("premium.processing") : t("premium.unlockPersonalization")}
            </button>
          </div>
        ) : null}

        <fieldset className="bn-personalization-card__controls" disabled={!isPremium}>
          <div className="bn-personalization-card__group">
            <span>{t("premium.preferredCountries")}</span>
            <div className="bn-personalization-card__chips">
              {regions.filter(item => item.code !== "world").map(item => (
                <button
                  key={item.code}
                  type="button"
                  className={preferredRegions.includes(item.code) ? "is-active" : ""}
                  onClick={() => togglePreference("preferredRegions", item.code)}
                >
                  {item.flag} {getRegionLabel(item.code, uiLanguage)}
                </button>
              ))}
            </div>
          </div>

          <div className="bn-personalization-card__group">
            <span>{t("premium.preferredCategories")}</span>
            <div className="bn-personalization-card__chips">
              {CATEGORIES.filter(item => item.id !== "all").map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={preferredCategories.includes(item.id) ? "is-active" : ""}
                  onClick={() => togglePreference("preferredCategories", item.id)}
                >
                  {item.emoji} {getCategoryLabel(item.id, uiLanguage)}
                </button>
              ))}
            </div>
          </div>

          <label className="bn-personalization-card__toggle">
            <input
              type="checkbox"
              checked={strictPositiveFilter}
              onChange={event => setDraftPreferences(currentPreferences => ({
                ...currentPreferences,
                strictPositiveFilter: event.target.checked,
              }))}
            />
            <span>
              <strong>{t("premium.strictFilterTitle")}</strong>
              <small>{t("premium.strictFilterDescription")}</small>
            </span>
          </label>

          <label className="bn-personalization-card__toggle">
            <input
              type="checkbox"
              checked={hideSavedStories}
              onChange={event => setDraftPreferences(currentPreferences => ({
                ...currentPreferences,
                hideSavedStories: event.target.checked,
              }))}
            />
            <span>
              <strong>{t("premium.freshFeedTitle")}</strong>
              <small>{t("premium.freshFeedDescription")}</small>
            </span>
          </label>

          {isPremium ? (
            <div className="bn-personalization-card__actions">
              <button
                type="button"
                className="bn-button bn-button--primary"
                onClick={() => handleConfirmPersonalization(draftPreferences)}
                disabled={personalizationSaving || !hasDraftPreferences}
              >
                {personalizationSaving ? t("premium.applyingPersonalization") : t("premium.applyPersonalization")}
              </button>
              <span>
                {preferencesChanged
                  ? t("premium.personalizationUnsaved")
                  : t("premium.personalizationApplied")}
              </span>
            </div>
          ) : null}
        </fieldset>
      </section>

      {accountFooter}
    </section>
  );
};

export default AccountTab;
