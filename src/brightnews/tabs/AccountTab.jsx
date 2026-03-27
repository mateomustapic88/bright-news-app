import AuthPanel from "../components/AuthPanel";

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
  </section>
);

export default AccountTab;
