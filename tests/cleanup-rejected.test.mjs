import test from "node:test";
import assert from "node:assert/strict";
import { cleanupRejectedArticles } from "../scripts/cleanup-rejected-articles.mjs";

test("cleanup rechecks eligibility on deletion and counts only deleted rows", async () => {
  const calls = [];
  const responses = [{ data: [{ id: 1 }, { id: 2 }] }, { data: [{ id: 1 }] }, { data: [] }];
  const client = { from(table) {
    assert.equal(table, "raw_articles");
    const call = [];
    calls.push(call);
    const query = { then(resolve) { return Promise.resolve(responses.shift()).then(resolve); } };
    for (const method of ["select", "eq", "is", "lt", "order", "limit", "delete", "in"])
      query[method] = (...args) => { call.push([method, ...args]); return query; };
    return query;
  } };
  const result = await cleanupRejectedArticles(client, Date.parse("2026-09-25T12:00:00Z"));
  assert.deepEqual(result, { deleted: 1, cutoff: "2026-09-11T12:00:00.000Z", capped: false });
  for (const call of calls) {
    assert.ok(call.some(args => JSON.stringify(args) === JSON.stringify(["eq", "review_status", "rejected"])));
    assert.ok(call.some(args => JSON.stringify(args) === JSON.stringify(["is", "published_story_id", null])));
    assert.ok(call.some(args => JSON.stringify(args) === JSON.stringify(["lt", "created_at", result.cutoff])));
  }
  assert.deepEqual(calls[1].find(args => args[0] === "in"), ["in", "id", [1, 2]]);
});

test("database errors fail cleanup", async () => {
  const query = {};
  for (const method of ["select", "eq", "is", "lt", "order", "limit"]) query[method] = () => query;
  query.then = resolve => Promise.resolve({ error: { message: "database unavailable" } }).then(resolve);
  await assert.rejects(cleanupRejectedArticles({ from: () => query }), /database unavailable/);
});
