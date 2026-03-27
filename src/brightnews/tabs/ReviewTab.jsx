import { REVIEW_FILTERS } from "../constants";
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
}) => {
  if (!session?.user) {
    return (
      <section className="bn-tab bn-review-tab">
        <h2>🛠️ Review Queue</h2>
        <p className="bn-tab-note">Sign in first to review imported stories.</p>
      </section>
    );
  }

  if (!profile?.is_admin) {
    return (
      <section className="bn-tab bn-review-tab">
        <h2>🛠️ Review Queue</h2>
        <p className="bn-tab-note">This area is only available to admin accounts.</p>
      </section>
    );
  }

  return (
    <section className="bn-tab bn-review-tab">
      <div className="bn-review-tab__header">
        <div>
          <h2>🛠️ Review Queue</h2>
          <p>Approve positive candidates here, then run `npm run publish:approved`.</p>
        </div>

        <button
          type="button"
          onClick={handleRefreshRawArticles}
          className="bn-button bn-button--secondary"
        >
          Refresh
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
            <span>{item.label}</span>
          </Chip>
        ))}
      </div>

      {rawLoading && <StatusMessage variant="info">Loading review queue...</StatusMessage>}
      {rawError && <StatusMessage variant="error">{rawError}</StatusMessage>}

      {!rawLoading && !rawError && rawArticles.length === 0 && (
        <EmptyState icon="🗂️" description="No raw articles found for this filter." />
      )}

      <div className="bn-stack">
        {rawArticles.map(article => (
          <RawArticleCard
            key={article.id}
            article={article}
            handleApproveRawArticle={handleApproveRawArticle}
            handleRejectRawArticle={handleRejectRawArticle}
          />
        ))}
      </div>
    </section>
  );
};

export default ReviewTab;
