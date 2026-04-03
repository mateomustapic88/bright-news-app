const DialogOverlay = ({
  children,
  overlayClassName = "",
  surfaceClassName = "",
  ariaLabel,
  ariaLabelledBy,
}) => (
  <div
    className={`bn-dialog-overlay${overlayClassName ? ` ${overlayClassName}` : ""}`}
    role="dialog"
    aria-modal="true"
    aria-label={ariaLabel}
    aria-labelledby={ariaLabel ? undefined : ariaLabelledBy}
  >
    <div className={surfaceClassName}>{children}</div>
  </div>
);

export default DialogOverlay;
