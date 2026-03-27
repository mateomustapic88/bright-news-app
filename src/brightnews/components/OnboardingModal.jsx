const ONBOARDING_POINTS = [
  {
    emoji: "🌍",
    title: "Positive news, globally",
    description: "Read real uplifting stories from multiple regions instead of doomscrolling the same negativity.",
  },
  {
    emoji: "🔗",
    title: "Real source links",
    description: "Open the original source behind each story so the feed still feels credible and grounded.",
  },
  {
    emoji: "❤️",
    title: "Save and share",
    description: "Keep the stories that matter to you and share the best ones with other people.",
  },
];

const OnboardingModal = ({ session, handleDismiss, handleGoogleSignIn }) => (
  <div className="bn-onboarding" role="dialog" aria-modal="true" aria-labelledby="bn-onboarding-title">
    <div className="bn-onboarding__surface">
      <p className="bn-onboarding__eyebrow">Welcome to BrightNews</p>
      <h2 id="bn-onboarding-title">A calmer way to stay informed</h2>
      <p className="bn-onboarding__intro">
        BrightNews surfaces credible positive stories from around the world. Start with the world
        feed, switch regions and categories, and save the stories worth keeping.
      </p>

      <div className="bn-onboarding__grid">
        {ONBOARDING_POINTS.map(item => (
          <article key={item.title} className="bn-onboarding__card">
            <span className="bn-onboarding__icon" aria-hidden="true">{item.emoji}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>

      <div className="bn-onboarding__actions">
        {!session?.user && (
          <button type="button" className="bn-button bn-button--secondary" onClick={handleGoogleSignIn}>
            Sign in with Google
          </button>
        )}
        <button type="button" className="bn-button bn-button--primary" onClick={handleDismiss}>
          Start reading
        </button>
      </div>
    </div>
  </div>
);

export default OnboardingModal;
