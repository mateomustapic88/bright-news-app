const StoryActionIcon = ({ name, active = false, className = "" }) => {
  const classes = `bn-story-action-icon ${className}`.trim();

  if (name === "heart") {
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M12 20.2C7.3 16.7 4.2 13.8 4.2 9.9c0-2.5 1.9-4.4 4.3-4.4 1.4 0 2.7.7 3.5 1.8.8-1.1 2.1-1.8 3.5-1.8 2.4 0 4.3 1.9 4.3 4.4 0 3.9-3.1 6.8-7.8 10.3Z"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d="M8.2 9.2c.4-.7 1-1.1 1.8-1.1"
          fill="none"
          stroke={active ? "#FFFFFF" : "currentColor"}
          strokeLinecap="round"
          strokeWidth="1.7"
          opacity={active ? "0.9" : "0.45"}
        />
      </svg>
    );
  }

  if (name === "share") {
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M8.1 11.1 15.2 7M8.1 12.9l7.1 4.1"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <circle cx="6.2" cy="12" r="3.1" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.8" cy="5.6" r="3.1" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.8" cy="18.4" r="3.1" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }

  if (name === "source") {
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M9.8 14.2 14.2 9.8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          d="M10.9 6.5 12.2 5.2a4.4 4.4 0 0 1 6.2 6.2l-2 2a4.4 4.4 0 0 1-5.7.4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d="M13.1 17.5 11.8 18.8a4.4 4.4 0 0 1-6.2-6.2l2-2a4.4 4.4 0 0 1 5.7-.4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (name === "location") {
    return (
      <svg className={classes} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M12 21s6.5-5.7 6.5-11.2A6.5 6.5 0 0 0 5.5 9.8C5.5 15.3 12 21 12 21Z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <circle cx="12" cy="9.8" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }

  return null;
};

export default StoryActionIcon;
