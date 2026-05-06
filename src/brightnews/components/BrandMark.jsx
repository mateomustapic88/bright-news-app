const BrandMark = ({ className = "" }) => (
  <svg
    className={`bn-brand-mark${className ? ` ${className}` : ""}`}
    viewBox="0 0 1024 1024"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M631 184c0 46-37 83-83 83s-83-37-83-83 37-83 83-83 83 37 83 83Z" />
    <path d="M271 363c0-32 26-58 58-58h208c32 0 58 26 58 58s-26 58-58 58H329c-32 0-58-26-58-58Z" />
    <path d="M331 493c0-32 26-58 58-58h306c32 0 58 26 58 58s-26 58-58 58H389c-32 0-58-26-58-58Z" />
    <path d="M271 623c0-32 26-58 58-58h366c32 0 58 26 58 58s-26 58-58 58H329c-32 0-58-26-58-58Z" />
    <path d="M324 754c0-32 26-58 58-58h260c32 0 58 26 58 58s-26 58-58 58H382c-32 0-58-26-58-58Z" />
  </svg>
);

export default BrandMark;
