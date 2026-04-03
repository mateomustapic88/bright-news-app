import DialogOverlay from "./DialogOverlay";

const OnboardingModal = ({ session, handleDismiss, handleGoogleSignIn, t }) => {
  const onboardingPoints = [
    {
      emoji: "🌍",
      title: t("onboarding.point1Title"),
      description: t("onboarding.point1Description"),
    },
    {
      emoji: "🔗",
      title: t("onboarding.point2Title"),
      description: t("onboarding.point2Description"),
    },
    {
      emoji: "❤️",
      title: t("onboarding.point3Title"),
      description: t("onboarding.point3Description"),
    },
  ];

  return (
    <DialogOverlay overlayClassName="bn-onboarding" surfaceClassName="bn-onboarding__surface" ariaLabelledBy="bn-onboarding-title">
        <div className="bn-onboarding__hero">
          <p className="bn-onboarding__eyebrow">{t("onboarding.eyebrow")}</p>
          <h2 id="bn-onboarding-title">{t("onboarding.title")}</h2>
          <p className="bn-onboarding__intro">{t("onboarding.intro")}</p>
        </div>

        <div className="bn-onboarding__grid">
          {onboardingPoints.map(item => (
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
              {t("onboarding.signInWithGoogle")}
            </button>
          )}
          <button type="button" className="bn-button bn-button--primary" onClick={handleDismiss}>
            {t("onboarding.startReading")}
          </button>
        </div>

        <p className="bn-onboarding__hint">{t("onboarding.hint")}</p>
    </DialogOverlay>
  );
};

export default OnboardingModal;
