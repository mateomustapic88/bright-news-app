// Supabase also returns UTC timestamp-without-time-zone columns without a trailing Z.
export const parseDatabaseDate = value => Date.parse(typeof value === "string" && value.includes("T") && !/(Z|[+-]\d{2}:?\d{2})$/i.test(value) ? `${value}Z` : value);

export const getNewsHealthFailures = ({ latestCreatedAt, latestPublishedAt, approvedCount = 0 }, now = Date.now()) => {
  const failures = [];
  const created = parseDatabaseDate(latestCreatedAt);
  const published = parseDatabaseDate(latestPublishedAt);
  if (!Number.isFinite(created) || created > now + 5 * 60_000 || now - created > 24 * 3600_000) {
    failures.push("No new story has been added to the feed in the last 24 hours.");
  }
  if (!Number.isFinite(published) || published > now + 5 * 60_000 || now - published > 48 * 3600_000) {
    failures.push("The newest source story is over 48 hours old, missing, or future-dated.");
  }
  if (approvedCount >= 200) failures.push(`${approvedCount} approved articles are waiting for publication.`);
  return failures;
};
