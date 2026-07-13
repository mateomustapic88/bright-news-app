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
  premiumPurchaseLoading = false,
  premiumPurchaseFeedback = null,
  premiumCheckoutEnabled = true,
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
  const planLabel = isPremium ? t("premium.planPremium") : t("premium.planFree");
  const [draftPreferences, setDraftPreferences] = useState(userPreferences || {});
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
            {premiumPurchaseFeedback ? (
              <p className={`bn-premium-card__feedback bn-premium-card__feedback--${premiumPurchaseFeedback.variant || "info"}`}>
                {premiumPurchaseFeedback.message}
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className="bn-account-settings" aria-labelledby="bn-account-settings-title">
        <div className="bn-account-settings__header">
          <p>{t("premium.personalizationEyebrow")}</p>
          <h2 id="bn-account-settings-title">{t("topbar.language")} &amp; {t("topbar.themeSystem")}</h2>
        </div>

        <label className="bn-account-setting-row">
          <span className="bn-account-setting-row__icon"><AppIcon name="moon" size={20} /></span>
          <span className="bn-account-setting-row__copy">
            <strong>{t("topbar.themeLight").replace(/\s+theme$/i, "")}</strong>
            <small>{t(`topbar.theme${themePreference === "dark" ? "Dark" : themePreference === "light" ? "Light" : "System"}`)}</small>
          </span>
          <select value={themePreference} onChange={event => setThemePreference?.(event.target.value)}>
            <option value="system">{t("topbar.themeSystem")}</option>
            <option value="light">{t("topbar.themeLight")}</option>
            <option value="dark">{t("topbar.themeDark")}</option>
          </select>
        </label>

        {appLanguages.length > 1 ? (
          <label className="bn-account-setting-row">
            <span className="bn-account-setting-row__icon"><AppIcon name="language" size={20} /></span>
            <span className="bn-account-setting-row__copy">
              <strong>{t("topbar.language")}</strong>
              <small>{getLanguageLabel(appLanguage, uiLanguage)}</small>
            </span>
            <select value={appLanguage} onChange={event => setAppLanguage?.(event.target.value)}>
              {appLanguages.map(item => (
                <option key={item.id} value={item.id}>{getLanguageLabel(item.id, uiLanguage)}</option>
              ))}
            </select>
          </label>
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
    </section>
  );
};

export default AccountTab;
