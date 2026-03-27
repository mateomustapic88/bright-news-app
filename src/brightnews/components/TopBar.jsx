const getInitials = value =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("") || "BN";

const TopBar = ({ session, setTab }) => {
  const label =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email ||
    "Account";
  const avatarUrl = session?.user?.user_metadata?.avatar_url || "";

  return (
    <div className="bn-top-bar">
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
