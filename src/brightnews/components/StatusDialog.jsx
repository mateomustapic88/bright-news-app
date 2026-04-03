import DialogOverlay from "./DialogOverlay";

const StatusDialog = ({ label, message, className = "" }) => (
  <DialogOverlay ariaLabel={label} overlayClassName={className} surfaceClassName="bn-status-dialog">
    <span className="bn-status-dialog__spinner" aria-hidden="true" />
    <p>{message}</p>
  </DialogOverlay>
);

export default StatusDialog;
