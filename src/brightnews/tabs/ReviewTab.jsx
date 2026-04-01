import { REVIEW_FILTERS } from "../constants";
import { getReviewFilterLabel } from "../i18n";
import Chip from "../components/Chip";
import EmptyState from "../components/EmptyState";
import RawArticleCard from "../components/RawArticleCard";
import StatusMessage from "../components/StatusMessage";

const ReviewTab = ({
  session,
  profile,
  rawArticles,
  rawLoading,
  rawError,
  reviewFilter,
  setReviewFilter,
  handleRefreshRawArticles,
  handleApproveRawArticle,
  handleRejectRawArticle,
  t,
  uiLanguage,
}) => {
  if (!session?.user) {
    return (
      <section className="bn-tab bn-review-tab">
        <h2>{t("review.title")}</h2>
        <p className="bn-tab-note">{t("review.signInFirst")}</p>
      </section>
    );
  }

  if (!profile?.is_admin) {
    return (
      <section className="bn-tab bn-review-tab">
        <h2>{t("review.title")}</h2>
        <p className="bn-tab-note">{t("review.adminOnly")}</p>
      </section>
    );
  }

  return (
    <section className="bn-tab bn-review-tab">
      <div className="bn-review-tab__header">
        <div>
          <h2>{t("review.title")}</h2>
          <p>{t("review.intro")}</p>
        </div>

        <button
          type="button"
          onClick={handleRefreshRawArticles}
          className="bn-button bn-button--secondary"
        >
          {t("review.refresh")}
        </button>
      </div>

      <div className="bn-chip-row">
        {REVIEW_FILTERS.map(item => (
          <Chip
            key={item.id}
            active={reviewFilter === item.id}
            onClick={() => setReviewFilter(item.id)}
            className="bn-chip--review"
          >
            <span>{getReviewFilterLabel(item.id, uiLanguage)}</span>
          </Chip>
        ))}
      </div>

      {rawLoading && <StatusMessage variant="info">{t("review.loading")}</StatusMessage>}
      {rawError && <StatusMessage variant="error">{rawError}</StatusMessage>}

      {!rawLoading && !rawError && rawArticles.length === 0 && (
        <EmptyState icon="🗂️" description={t("review.empty")} />
      )}

      <div className="bn-stack">
        {rawArticles.map(article => (
          <RawArticleCard
            key={article.id}
            article={article}
            handleApproveRawArticle={handleApproveRawArticle}
            handleRejectRawArticle={handleRejectRawArticle}
            t={t}
          />
        ))}
      </div>
    </section>
  );
};

export default ReviewTab;
