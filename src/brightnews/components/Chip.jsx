const Chip = ({ active = false, className = "", onClick, children }) => {
  const classes = ["bn-chip", active ? "is-active" : "", className].filter(Boolean).join(" ");

  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  );
};

export default Chip;
