# Weekly Briefing and Premium Reading

- Home includes an on-demand briefing of up to five published stories from the last complete Monday-to-Monday UTC week. The date range is displayed. The edition rolls over on Monday without a scheduled job or rebuild.
- Selection prefers pinned and saved stories, then topic and publisher diversity. It considers up to 300 matching published stories, excludes missing summaries, and deduplicates source URLs. This is automated selection, not a claim of manual editorial review.
- Everyone can read the worldwide briefing. Premium readers can use their existing country and topic preferences for a personalized edition. No matching stories produces an empty state, not stories outside the selected week or preferences.
- Original source links keep the existing free-read limit and purchase flow. Briefing summaries remain free.
- Source openings and explicit read/unread controls in briefings and Saved update reading history. Opening a source marks it read; this does not prove the user finished reading it.
- Reading history is bounded to 3,000 IDs, stored per account on this device, and updated across browser tabs. It is not synchronized across devices. The new hide-read preference is also local, like the existing hide-saved preference.
- Premium can hide read stories in the personalized feed and search/filter Saved by topic and reading status. Saving and marking read are independent actions.
- No database migration, email signup, or delivery job is required. Email delivery was explicitly deferred. A future synced history needs an account-owned table with RLS; do not describe current history as cloud-synced.
- Verify domain logic with `node --test tests/reading.test.mjs` and build with `npx vite build`.

## Suggested Next Feature

"Today's bright moment": signed-in users submit a short original positive experience, optionally including a source. Submissions should be private until an administrator approves them. Keep community experiences visibly separate from sourced news. Begin without comments, direct messages, or automatic publishing; add reporting, submission limits, and author deletion before launch.
