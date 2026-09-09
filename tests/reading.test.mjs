import test from "node:test";
import assert from "node:assert/strict";
import { getBriefingWeek, selectBriefingStories } from "../src/brightnews/weeklyBriefing.js";
import { filterSavedLibrary, readReadingHistory, writeReadingHistory } from "../src/brightnews/readingHistory.js";
import { readFileSync } from "node:fs";

const week = { start: "2026-08-31T00:00:00.000Z", end: "2026-09-07T00:00:00.000Z" };
const story = (id, extra = {}) => ({ id, headline: "A community garden", summary: "A new green space opens.", category: "Environment", regionCode: "hr", location: "Local News", publishedAt: "2026-09-03T12:00:00Z", ...extra });

test("the edition uses the last completed UTC week across week and year boundaries", () => {
  assert.deepEqual(getBriefingWeek(new Date("2026-09-08T17:00:00Z")), week);
  assert.deepEqual(getBriefingWeek(new Date("2026-09-07T00:00:00Z")), week);
  assert.equal(getBriefingWeek(new Date("2026-09-06T23:59:59Z")).end, week.start);
  assert.deepEqual(getBriefingWeek(new Date("2026-01-01T01:00:00Z")), { start: "2025-12-22T00:00:00.000Z", end: "2025-12-29T00:00:00.000Z" });
});

test("briefing excludes old, future, undated, empty, and duplicate articles", () => {
  const items = [story("start", { publishedAt: week.start }), story("old", { publishedAt: "2026-08-30" }), story("future", { publishedAt: week.end }), story("bad", { publishedAt: "invalid" }), story("empty", { summary: "" }), story("one", { sourceUrl: "https://example.com/one" }), story("copy", { sourceUrl: "https://example.com/one" })];
  assert.deepEqual(new Set(selectBriefingStories(items, week).map(item => item.id)), new Set(["start", "one"]));
});

test("briefing diversifies topics and publishers before filling five places", () => {
  const items = Array.from({ length: 6 }, (_, n) => story(`popular-${n}`, { savedCount: 100 - n }));
  items.push(story("science", { category: "Science", location: "Science News" }));
  const selected = selectBriefingStories(items, week);
  assert.equal(selected.length, 5);
  assert.equal(selected[1].id, "science");
  assert.deepEqual(selectBriefingStories(items.toReversed(), week), selected);
});

test("personalized briefing respects both preferences and never fills gaps with unrelated articles", () => {
  const items = [story("hr"), story("us", { regionCode: "us" }), story("health", { category: "Health" })];
  assert.deepEqual(selectBriefingStories(items, week, { preferredRegions: ["hr"], preferredCategories: ["Health"] }).map(item => item.id), ["health"]);
  assert.deepEqual(selectBriefingStories(items, week, { preferredRegions: ["jp"] }), []);
});

test("reading status is isolated per account and robust to invalid storage", () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  writeReadingHistory(storage, "alice", ["one", "one", "two"]);
  assert.deepEqual(readReadingHistory(storage, "alice"), ["one", "two"]);
  assert.deepEqual(readReadingHistory(storage, "bob"), []);
  assert.deepEqual(readReadingHistory(storage, null), []);
  writeReadingHistory(storage, "alice", ["two"]);
  assert.deepEqual(readReadingHistory(storage, "alice"), ["two"]);
  assert.deepEqual(readReadingHistory({ getItem: () => "bad JSON" }, "alice"), []);
  assert.doesNotThrow(() => writeReadingHistory({ setItem: () => { throw Error("quota"); } }, "alice", ["one"]));
});

test("saved library combines category, search, and read status without changing saved order", () => {
  const items = [story("a"), story("b", { headline: "A science breakthrough", category: "Science" }), story("c")];
  assert.deepEqual(filterSavedLibrary(items, { status: "unread", readIds: ["a"] }).map(item => item.id), ["b", "c"]);
  assert.deepEqual(filterSavedLibrary(items, { category: "Science", search: " BREAKTHROUGH ", status: "read", readIds: ["b"] }).map(item => item.id), ["b"]);
  assert.equal(items.length, 3);
});

test("every supported language includes all reading feature translations", () => {
  const load = locale => JSON.parse(readFileSync(new URL(`../src/brightnews/locales/${locale}.json`, import.meta.url))).reading;
  const keys = Object.keys(load("en")).sort();
  for (const locale of ["hr", "sl", "sr", "bs", "de", "fr", "ja", "pt"]) {
    assert.deepEqual(Object.keys(load(locale)).sort(), keys);
    assert.ok(Object.values(load(locale)).every(value => typeof value === "string" && value.length));
  }
});
