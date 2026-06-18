const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.mateomustapic.brightnews";

const AppStoreDock = ({ onGooglePlayClick, t }) => (
  <aside className="bn-app-store-dock" aria-label={t("appStore.downloadApp")}>
    <a
      className="bn-app-store-dock__google-play"
      href={GOOGLE_PLAY_URL}
      target="_blank"
      rel="noreferrer noopener"
      onClick={onGooglePlayClick}
    >
      <span className="bn-app-store-dock__play-icon" aria-hidden="true">▶</span>
      <span className="bn-app-store-dock__copy">
        <small>{t("appStore.getItOn")}</small>
        <strong>Google Play</strong>
      </span>
    </a>

    <span className="bn-app-store-dock__ios" aria-disabled="true">
      <span className="bn-app-store-dock__ios-mark" aria-hidden="true">iOS</span>
      <span className="bn-app-store-dock__copy">
        <small>{t("appStore.iosApp")}</small>
        <strong>{t("appStore.comingSoon")}</strong>
      </span>
    </span>
  </aside>
);

export default AppStoreDock;
