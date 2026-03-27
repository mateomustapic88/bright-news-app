const EmptyState = ({ icon, title, description }) => (
  <div className="bn-empty-state">
    <div className="bn-empty-state__icon">{icon}</div>
    {title ? <h3>{title}</h3> : null}
    <p>{description}</p>
  </div>
);

export default EmptyState;
