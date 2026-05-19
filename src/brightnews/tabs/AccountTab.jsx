import AuthPanel from "../components/AuthPanel";
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
  handleGoogleSignIn,
  handleEmailAuth,
  handleSignOut,
  handleFeedbackClick,
  t,
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
  const planLabel = (profile?.plan || "free").toUpperCase();

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
