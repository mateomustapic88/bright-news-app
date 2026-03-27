import AuthPanel from "../components/AuthPanel";
import { LEGAL_LINKS } from "../../lib/appConfig";

const AccountTab = ({
  session,
  profile,
  profileLoading,
  authLoading,
  authMessage,
  authError,
  syncingSaved,
  handleGoogleSignIn,
  handleSignOut,
}) => (
  <section className="bn-tab bn-account-tab">
    <h2>{session?.user ? "👤 Account" : "🔐 Account"}</h2>

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
    />

    <section className="bn-account-resources">
      <h3>Support and privacy</h3>
      <p>
        BrightNews already exposes the support, privacy, and account-deletion links that app stores
        ask for. Keep these pages updated before wider beta rollout.
      </p>
      <div className="bn-account-resources__actions">
        <a className="bn-button bn-button--secondary" href={LEGAL_LINKS.support} target="_blank" rel="noreferrer">
          Support
        </a>
        <a className="bn-button bn-button--secondary" href={LEGAL_LINKS.privacy} target="_blank" rel="noreferrer">
          Privacy policy
        </a>
        <a className="bn-button bn-button--danger" href={LEGAL_LINKS.deletion} target="_blank" rel="noreferrer">
          Request account deletion
        </a>
      </div>
    </section>
  </section>
);

export default AccountTab;
