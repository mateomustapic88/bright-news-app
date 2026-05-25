import AuthPanel from "../components/AuthPanel";
import { CATEGORIES, FREE_SOURCE_READ_LIMIT, PREMIUM_PRICE_LABEL, isPremiumProfile } from "../constants";
import { getCategoryLabel, getRegionLabel } from "../i18n";
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
  handlePreferenceChange,
  handleStartPremiumPurchase,
  premiumPurchaseLoading = false,
  handleGoogleSignIn,
  handleEmailAuth,
  handleSignOut,
  handleFeedbackClick,
  t,
  uiLanguage,
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
  const preferredRegions = userPreferences?.preferredRegions || [];
  const preferredCategories = userPreferences?.preferredCategories || [];
  const strictPositiveFilter = Boolean(userPreferences?.strictPositiveFilter);
  const togglePreference = (field, value) => {
    const current = field === "preferredRegions" ? preferredRegions : preferredCategories;
    const next = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];
    handlePreferenceChange({ [field]: next });
  };

  return (
    <section className="bn-tab bn-account-tab">
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
            <p className="bn-premium-card__eyebrow">{t("premium.eyebrow")}</p>
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
          <span>✓ {t("premium.benefitUnlimitedSources")}</span>
          <span>✓ {t("premium.benefitPersonalization")}</span>
          <span>✓ {t("premium.benefitStrictFilter")}</span>
        </div>

        {isPremium ? (
          <p className="bn-premium-card__status">{t("premium.active")}</p>
        ) : (
          <button
            type="button"
            className="bn-button bn-button--primary"
            onClick={handleStartPremiumPurchase}
            disabled={premiumPurchaseLoading}
          >
            {premiumPurchaseLoading ? t("premium.processing") : t("premium.choosePlan")}
          </button>
        )}
      </section>

      <section className={`bn-account-card bn-personalization-card${!isPremium ? " is-locked" : ""}`}>
        <div className="bn-personalization-card__header">
          <div>
            <p className="bn-premium-card__eyebrow">{t("premium.personalizationEyebrow")}</p>
            <h2>{t("premium.personalizationTitle")}</h2>
          </div>
          {!isPremium ? <span className="bn-personalization-card__lock">{t("premium.premiumOnly")}</span> : null}
        </div>

        <p className="bn-premium-card__description">{t("premium.personalizationDescription")}</p>

        <div className="bn-personalization-card__group">
          <span>{t("premium.preferredCountries")}</span>
          <div className="bn-personalization-card__chips">
            {regions.filter(item => item.code !== "world").map(item => (
              <button
                key={item.code}
                type="button"
                className={preferredRegions.includes(item.code) ? "is-active" : ""}
                onClick={() => togglePreference("preferredRegions", item.code)}
                disabled={!isPremium}
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
                disabled={!isPremium}
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
            onChange={event => handlePreferenceChange({ strictPositiveFilter: event.target.checked })}
            disabled={!isPremium}
          />
          <span>
            <strong>{t("premium.strictFilterTitle")}</strong>
            <small>{t("premium.strictFilterDescription")}</small>
          </span>
        </label>
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
      </footer>
    </section>
  );
};

export default AccountTab;
