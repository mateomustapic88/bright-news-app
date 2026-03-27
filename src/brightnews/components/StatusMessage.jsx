const StatusMessage = ({ variant = "neutral", children, showDot = false }) => (
  <div className={`bn-status-message bn-status-message--${variant}`}>
    {showDot && <span className="bn-status-message__dot" aria-hidden="true" />}
    <span>{children}</span>
  </div>
);

export default StatusMessage;
