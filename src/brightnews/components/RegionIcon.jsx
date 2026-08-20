import { REGION_MAP_PATHS } from "./regionMapPaths";

const FLAG_CODES = {
  us: "us",
  uk: "gb",
  hr: "hr",
  si: "si",
  rs: "rs",
  ba: "ba",
  de: "de",
  fr: "fr",
  ca: "ca",
  jp: "jp",
  my: "my",
  au: "au",
  br: "br",
  in: "in",
};

const WorldIcon = () => (
  <svg viewBox="0 0 48 48" role="img" focusable="false">
    <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="2.4" />
    <path d={REGION_MAP_PATHS.world} fill="currentColor" strokeLinejoin="round" />
  </svg>
);

const ContinentIcon = ({ code }) => (
  <svg viewBox="0 0 48 48" role="img" focusable="false">
    <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="2.4" />
    <path
      d={REGION_MAP_PATHS[code]}
      fill="currentColor"
      strokeLinejoin="round"
    />
  </svg>
);

const RegionIcon = ({ code, fallback, className = "" }) => {
  const flagCode = FLAG_CODES[code];
  const classes = `bn-region-icon ${className}`.trim();

  if (flagCode) {
    return (
      <span className={classes} aria-hidden="true">
        <img
          src={`https://flagcdn.com/w80/${flagCode}.png`}
          srcSet={`https://flagcdn.com/w40/${flagCode}.png 40w, https://flagcdn.com/w80/${flagCode}.png 80w`}
          sizes="44px"
          alt=""
          loading="lazy"
          decoding="async"
          className="bn-region-icon__flag"
        />
      </span>
    );
  }

  if (code === "world") {
    return (
      <span className={`${classes} bn-region-icon--symbol`} aria-hidden="true">
        <WorldIcon />
      </span>
    );
  }

  if (REGION_MAP_PATHS[code]) {
    return (
      <span className={`${classes} bn-region-icon--symbol`} aria-hidden="true">
        <ContinentIcon code={code} />
      </span>
    );
  }

  return <span className={`bn-region-icon__fallback ${className}`.trim()}>{fallback}</span>;
};

export default RegionIcon;
