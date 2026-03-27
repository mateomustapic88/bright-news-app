const HTTP_PROTOCOLS = new Set(["http:", "https:"]);
const PLACEHOLDER_HOSTS = new Set(["example.com", "www.example.com"]);

const stripWrappingPunctuation = value =>
  value.replace(/^[<("'[\s]+/, "").replace(/[>)"'\],.\s]+$/, "");

export const normalizeExternalUrl = value => {
  if (!value) return "";

  let candidate = stripWrappingPunctuation(String(value).trim());
  if (!candidate) return "";

  if (candidate.startsWith("//")) {
    candidate = `https:${candidate}`;
  } else if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    if (!HTTP_PROTOCOLS.has(parsed.protocol)) return "";
    if (PLACEHOLDER_HOSTS.has(parsed.hostname.toLowerCase())) return "";
    return parsed.toString();
  } catch {
    return "";
  }
};

export const hasExternalUrl = value => normalizeExternalUrl(value) !== "";
