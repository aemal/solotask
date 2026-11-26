import { test } from "node:test";
import assert from "node:assert/strict";
import { projectPulse, type ActivityEvent } from "../lib/activity-model";
test("cockpit pulse buckets a complete hour and distinguishes recent changes without health claims", () => {
  const now = Date.parse("2026-10-20T16:00:00Z");
  const events = [0, 60000, 300000, 3599999, 3600000, -1000].map((age, id) => ({ id: String(id), at: new Date(now - age).toISOString() }) as ActivityEvent);
  const result = projectPulse({ startedAt: "test", events }, now);
  assert.equal(result.count, 4); assert.equal(result.recentCount, 2);
  assert.equal(result.bins[39], 2); assert.equal(result.bins[0], 1);
  assert.equal(projectPulse({ startedAt: "test", events: [] }, now).count, 0);
  assert.equal(projectPulse({ startedAt: "test", events: [], warning: "Interrupted" }, now).warning, "Interrupted");
});
