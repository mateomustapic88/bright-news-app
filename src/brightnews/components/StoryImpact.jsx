const StoryImpact = ({ impact, compact = false, themeClass = "" }) => (
  <div className={`bn-story-impact ${themeClass} ${compact ? "is-compact" : ""}`.trim()}>
    <span>💡</span>
    <p>{impact}</p>
  </div>
);

export default StoryImpact;
