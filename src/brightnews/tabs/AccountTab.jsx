import AuthPanel from "../components/AuthPanel";
import {
  buildFeedbackMailto,
  LEGAL_LINKS,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO,
} from "../../lib/appConfig";

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

  return (
    <section className="bn-tab bn-account-tab">
      <h2>{session?.user ? t("account.signedInTitle") : t("account.signedOutTitle")}</h2>

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

      <section className="bn-account-resources">
        <h3>{t("account.resourcesTitle")}</h3>
        <p>
          {t("account.resourcesDescription")}
        </p>
        <p>
          {t("account.supportEmail")} <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>
        </p>
        <div className="bn-account-resources__actions">
          <a className="bn-button bn-button--primary" href={feedbackMailto} onClick={handleFeedbackClick}>
            {t("account.sendBetaFeedback")}
          </a>
          <a className="bn-button bn-button--secondary" href={LEGAL_LINKS.support} target="_blank" rel="noreferrer">
            {t("account.support")}
          </a>
          <a className="bn-button bn-button--secondary" href={LEGAL_LINKS.privacy} target="_blank" rel="noreferrer">
            {t("account.privacyPolicy")}
          </a>
          <a className="bn-button bn-button--danger" href={LEGAL_LINKS.deletion} target="_blank" rel="noreferrer">
            {t("account.accountDeletion")}
          </a>
        </div>
        <p className="bn-account-resources__hint">
          {t("account.resourcesHint")}
        </p>
      </section>
    </section>
  );
};

export default AccountTab;
