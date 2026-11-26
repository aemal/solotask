import { test } from "node:test";
import assert from "node:assert/strict";
import { taskResponse } from "../lib/task-response";
test("background task responses exclude server timing stores and bound history without mutating full feed", () => {
  const events = Array.from({ length: 100 }, (_, i) => ({ id: String(i), at: new Date(i * 1000).toISOString() }));
  const data = { tasks: [], activity: { startedAt: "test", timing: { private: "store" }, events } };
  const compact = taskResponse(data as never, false);
  assert.equal(compact.activity.events.length, 60);
  assert.equal(compact.activity.events[0].id, "99");
  assert.equal("timing" in compact.activity, false);
  assert.equal(taskResponse(data as never, true).activity.events.length, 100);
  assert.equal(data.activity.events.length, 100);
});
