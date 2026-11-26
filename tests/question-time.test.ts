import { test } from "node:test";
import assert from "node:assert/strict";
import { elapsedLabel } from "../lib/question-time";
test("question durations handle minutes, long waits and unknown or invalid ordering", () => {
  const start = "2026-10-20T10:00:00Z";
  assert.equal(elapsedLabel(start, "2026-10-20T10:00:30Z"), "less than a minute");
  assert.equal(elapsedLabel(start, "2026-10-20T10:12:00Z"), "12 min");
  assert.equal(elapsedLabel(start, "2026-10-20T11:12:00Z"), "1 hr 12 min");
  assert.equal(elapsedLabel(start, "2026-10-22T11:00:00Z"), "2 days 1 hr");
  assert.equal(elapsedLabel(start, "2026-10-20T09:00:00Z"), null);
  assert.equal(elapsedLabel(null), null);
  assert.equal(elapsedLabel("invalid"), null);
});
