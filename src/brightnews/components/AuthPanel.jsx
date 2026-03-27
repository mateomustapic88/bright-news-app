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
  handleSignOut,
}) => {
  const displayName =
    profile?.display_name ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email ||
    "BrightNews reader";
  const email = session?.user?.email || "";
  const avatarUrl = session?.user?.user_metadata?.avatar_url || "";
  const planLabel = (profile?.plan || "free").toUpperCase();

  return (
    <section className="bn-auth-panel">
      <div className="bn-auth-panel__header">
        <div>
          <h3>{session?.user ? "Google sync is active" : "Sign in with Google"}</h3>
          <p>
            {session?.user
              ? "Your saved stories now follow you across devices."
              : "Use your Google account to sync saves, reading history, and future preferences."}
          </p>
        </div>

        {session?.user && (
          <button type="button" onClick={handleSignOut} className="bn-button bn-button--secondary">
            Sign out
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
                {profileLoading ? "Loading account..." : displayName}
              </p>
              {email ? <p className="bn-account-summary__email">{email}</p> : null}
              <p className="bn-account-summary__plan">Plan: {planLabel}</p>
            </div>
          </div>

          <div className="bn-account-summary__status">
            <div className="bn-account-summary__badge">
              {profile?.onboarding_completed ? "READY" : "SETUP"}
            </div>
            <p className="bn-account-summary__status-text">Google account connected</p>
          </div>
        </div>
      )}

      {!session?.user && (
        <div className="bn-auth-help">
          <p className="bn-auth-help__eyebrow">Google Sync</p>
          <p className="bn-auth-help__text">
            Sign in once and keep your good-news collection synced everywhere you read.
          </p>
          <div className="bn-auth-help__benefits">
            <span className="bn-auth-help__benefit">Cross-device saves</span>
            <span className="bn-auth-help__benefit">Cleaner beta login</span>
            <span className="bn-auth-help__benefit">Future personalized briefings</span>
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
            <span>{authLoading ? "Redirecting..." : "Continue with Google"}</span>
          </button>
        </div>
      )}

      {syncingSaved && <p className="bn-feedback bn-feedback--accent">Syncing saved stories...</p>}
      {authMessage && <p className="bn-feedback bn-feedback--info">{authMessage}</p>}
      {authError && <p className="bn-feedback bn-feedback--error">{authError}</p>}
    </section>
  );
};

export default AuthPanel;
