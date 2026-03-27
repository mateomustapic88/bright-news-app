import { normalizeExternalUrl } from "../../lib/urls";

const RawArticleCard = ({ article, handleApproveRawArticle, handleRejectRawArticle }) => {
  const sourceUrl = normalizeExternalUrl(article.source_url);

  return (
    <article className="bn-raw-article-card">
      <div className="bn-raw-article-card__header">
        <span className="bn-raw-article-card__category">{article.category}</span>
        <span className="bn-raw-article-card__status" data-status={article.review_status}>
          {article.review_status.toUpperCase()}
        </span>
      </div>

      <h3>{article.title}</h3>
      <p>{article.description || article.content || "No preview available."}</p>

      <div className="bn-raw-article-card__footer">
        {sourceUrl ? (
          <a href={sourceUrl} target="_blank" rel="noreferrer noopener" className="bn-source-link is-compact">
            <span>🔗</span>
            <span>Read source</span>
          </a>
        ) : (
          <span className="bn-raw-article-card__missing-link">Invalid source link</span>
        )}

        <div className="bn-raw-article-card__actions">
          <button
            type="button"
            onClick={() => handleRejectRawArticle(article.id)}
            className="bn-button bn-button--danger"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => handleApproveRawArticle(article.id)}
            className="bn-button bn-button--success"
          >
            Approve
          </button>
        </div>
      </div>
    </article>
  );
};

export default RawArticleCard;
