import { useState } from "react";

const getInitials = value =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("") || "BN";

const AuthPanel = ({
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
  t,
}) => {
  const [authMode, setAuthMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    <section className="bn-auth-panel">
      <div className="bn-auth-panel__header">
        <div>
          <h3>{session?.user ? t("auth.activeTitleGeneric") : t("auth.signInTitleGeneric")}</h3>
          <p>
            {session?.user
              ? t("auth.activeDescriptionGeneric")
              : t("auth.signInDescriptionGeneric")}
          </p>
        </div>

        {session?.user && (
          <button type="button" onClick={handleSignOut} className="bn-button bn-button--secondary">
            {t("auth.signOut")}
          </button>
        )}
      </div>

      {session?.user && (
        <div className="bn-account-summary">
          <div className="bn-account-summary__identity">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="bn-account-summary__avatar" referrerPolicy="no-referrer" />
            ) : (
              <div className="bn-account-summary__avatar bn-account-summary__avatar--fallback">
                {getInitials(displayName)}
              </div>
            )}

            <div>
              <p className="bn-account-summary__name">
                {profileLoading ? t("auth.loadingAccount") : displayName}
              </p>
              {accountEmail ? <p className="bn-account-summary__email">{accountEmail}</p> : null}
              <p className="bn-account-summary__plan">{t("auth.plan", { plan: planLabel })}</p>
            </div>
          </div>

          <div className="bn-account-summary__status">
            <div className="bn-account-summary__badge">
              {profile?.onboarding_completed ? t("auth.ready") : t("auth.setup")}
            </div>
            <p className="bn-account-summary__status-text">{t("auth.connectedGeneric")}</p>
          </div>
        </div>
      )}

      {!session?.user && (
        <div className="bn-auth-help">
          <div className="bn-auth-method bn-auth-method--google">
            <div className="bn-auth-method__header">
              <div>
                <p className="bn-auth-help__eyebrow">{t("auth.accountSync")}</p>
                <p className="bn-auth-help__text">{t("auth.helpText")}</p>
              </div>
            </div>
            <div className="bn-auth-help__benefits">
              <span className="bn-auth-help__benefit">{t("auth.benefitCrossDevice")}</span>
              <span className="bn-auth-help__benefit">{t("auth.benefitCleanerLogin")}</span>
              <span className="bn-auth-help__benefit">{t("auth.benefitFutureBriefings")}</span>
            </div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="bn-google-button"
            >
              <span className="bn-google-button__badge" aria-hidden="true">
                <svg viewBox="0 0 18 18" className="bn-google-button__icon">
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62Z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H1v2.33A9 9 0 0 0 9 18Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.97 10.72A5.4 5.4 0 0 1 3.69 9c0-.6.1-1.19.28-1.72V4.95H1A9 9 0 0 0 0 9c0 1.45.35 2.82 1 4.05l2.97-2.33Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.32 0 2.5.45 3.43 1.34l2.57-2.57C13.46.9 11.42 0 9 0A9 9 0 0 0 1 4.95l2.97 2.33c.71-2.12 2.69-3.7 5.03-3.7Z"
                  />
                </svg>
              </span>
              <span>{authLoading ? t("auth.redirecting") : t("auth.continueWithGoogle")}</span>
            </button>
          </div>

          <div className="bn-auth-divider" aria-hidden="true">
            <span>{t("auth.orDivider")}</span>
          </div>

          <div className="bn-auth-method bn-auth-method--email">
            <div className="bn-auth-method__header">
              <div>
                <p className="bn-auth-method__eyebrow">{t("auth.emailSectionLabel")}</p>
                <p className="bn-auth-method__title">
                  {authMode === "register" ? t("auth.emailRegisterTitle") : t("auth.emailSignInTitle")}
                </p>
              </div>
            </div>

            <div className="bn-auth-mode-toggle" role="tablist" aria-label={t("auth.emailSectionLabel")}>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === "signin"}
                className={`bn-auth-mode-toggle__button${authMode === "signin" ? " is-active" : ""}`}
                onClick={() => setAuthMode("signin")}
              >
                {t("auth.emailSignInTab")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === "register"}
                className={`bn-auth-mode-toggle__button${authMode === "register" ? " is-active" : ""}`}
                onClick={() => setAuthMode("register")}
              >
                {t("auth.emailRegisterTab")}
              </button>
            </div>

            <form
              className="bn-email-auth-form"
              onSubmit={async event => {
                event.preventDefault();
                const result = await handleEmailAuth({
                  mode: authMode,
                  email,
                  password,
                  confirmPassword,
                });

                if (!result?.ok) return;

                setPassword("");
                setConfirmPassword("");

                if (authMode === "register") {
                  setAuthMode("signin");
                }
              }}
            >
              <label className="bn-auth-field">
                <span className="bn-auth-field__label">{t("auth.emailLabel")}</span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="bn-auth-field__input"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                  required
                  disabled={authLoading}
                />
              </label>

              <label className="bn-auth-field">
                <span className="bn-auth-field__label">{t("auth.passwordLabel")}</span>
                <input
                  type="password"
                  autoComplete={authMode === "register" ? "new-password" : "current-password"}
                  className="bn-auth-field__input"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder={t("auth.passwordPlaceholder")}
                  required
                  disabled={authLoading}
                />
              </label>

              {authMode === "register" && (
                <label className="bn-auth-field">
                  <span className="bn-auth-field__label">{t("auth.confirmPasswordLabel")}</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    className="bn-auth-field__input"
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    placeholder={t("auth.confirmPasswordPlaceholder")}
                    required
                    disabled={authLoading}
                  />
                </label>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="bn-email-auth-button"
              >
                {authLoading
                  ? t("auth.processing")
                  : authMode === "register"
                    ? t("auth.createAccount")
                    : t("auth.signInWithEmail")}
              </button>

              <p className="bn-auth-note">
                {authMode === "register" ? t("auth.registerHelp") : t("auth.signInHelp")}
              </p>
            </form>
          </div>
        </div>
      )}

      {syncingSaved && <p className="bn-feedback bn-feedback--accent">{t("auth.syncingSaved")}</p>}
      {authMessage && <p className="bn-feedback bn-feedback--info">{authMessage}</p>}
      {authError && <p className="bn-feedback bn-feedback--error">{authError}</p>}
    </section>
  );
};

export default AuthPanel;
