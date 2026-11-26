import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTasks } from "../lib/tasks";
import {
  updateTiming,
  timingFor,
  duration,
  type TimingStore,
} from "../lib/timing";
const time = (seconds: number) =>
  new Date(Date.parse("2026-10-20T00:00:00Z") + seconds * 1000).toISOString();
const tasks = (status: string, extra: Record<string, unknown> = {}) =>
  parseTasks(
    [{ id: 1, title: "Task", status, complexity: 4, ...extra }],
    "tasks.json",
  );
test("observed lifecycle excludes pauses and separates elapsed from in-progress time", () => {
  let store = updateTiming({}, tasks("pending"), time(0));
  for (const [second, status] of [
    [1, "in-progress"],
    [31, "in-progress"],
    [41, "blocked"],
    [51, "in-progress"],
    [61, "in-progress"],
    [71, "done"],
  ] as const)
    store = updateTiming(store, tasks(status), time(second));
  const result = timingFor(tasks("done")[0], store, 0, Date.parse(time(80)));
  assert.equal(result.inProgressMs, 60000);
  assert.equal(result.elapsedMs, 70000);
  assert.equal(result.partial, false);
});
test("mid-work baseline and observation gaps cannot calibrate estimates", () => {
  let store = updateTiming({}, tasks("in-progress"), time(0));
  store = updateTiming(store, tasks("done"), time(30));
  assert.equal(Object.values(store)[0].partial, true);
  store = updateTiming({}, tasks("pending"), time(0));
  store = updateTiming(store, tasks("in-progress"), time(1));
  store = updateTiming(store, tasks("done"), time(300));
  assert.equal(Object.values(store)[0].partial, true);
  assert.equal(Object.values(store)[0].inProgressMs, 0);
});
test("historical explicit timestamps provide elapsed time without inventing active time", () => {
  const data = tasks("done", { startedAt: time(0), completedAt: time(120) }),
    store = updateTiming({}, data, time(200)),
    info = timingFor(data[0], store, 0, Date.parse(time(200)));
  assert.equal(info.elapsedMs, 120000);
  assert.equal(info.elapsedSource, "recorded");
  assert.equal(info.partial, true);
  assert.equal(info.inProgressMs, 0);
  const noTimes = tasks("done", { createdAt: time(0), updatedAt: time(120) }),
    unknown = timingFor(noTimes[0], updateTiming({}, noTimes, time(200)), 0);
  assert.equal(unknown.elapsedMs, null);
});
test("calibration requires 3 complete samples and excludes partial, cancelled and child records", () => {
  const store: TimingStore = {};
  for (let index = 0; index < 3; index++)
    store[`sample${index}`] = {
      key: `sample${index}`,
      depth: 0,
      status: "done",
      inProgressMs: 120000 + index * 120000,
      lastObservedAt: time(1000),
      partial: false,
      complexity: 2,
    };
  const data = tasks("pending"),
    result = timingFor(data[0], store, 0);
  assert.equal(result.estimate?.remainingMs, 480000);
  assert.equal(result.estimate?.samples, 3);
  assert.ok(result.estimate!.lowMs < result.estimate!.highMs);
  assert.equal(timingFor(data[0], store, 1).estimate, null);
  store.sample0.partial = true;
  assert.equal(timingFor(data[0], store, 0).estimate, null);
  store.sample0.partial = false;
  store.sample0.status = "cancelled";
  assert.equal(timingFor(data[0], store, 0).estimate, null);
});
test("remaining effort decreases with observed work and marks overruns", () => {
  const store: TimingStore = {};
  for (let i = 0; i < 3; i++)
    store[`sample${i}`] = {
      key: `sample${i}`,
      depth: 0,
      status: "done",
      inProgressMs: 60000,
      lastObservedAt: time(1000),
      partial: false,
      complexity: 1,
    };
  const task = tasks("in-progress")[0];
  store[task.key] = {
    key: task.key,
    depth: 0,
    status: "in-progress",
    inProgressMs: 60000,
    lastObservedAt: time(1000),
    partial: false,
    complexity: 4,
    startedAt: time(0),
  };
  assert.equal(timingFor(task, store, 0).estimate?.remainingMs, 180000);
  store[task.key].inProgressMs = 300000;
  assert.equal(timingFor(task, store, 0).estimate?.overrun, true);
  assert.equal(
    timingFor({ ...task, complexity: null }, store, 0).estimate,
    null,
  );
});
test("reopened work starts a new cycle and cancelled timers stop", () => {
  let store = updateTiming({}, tasks("pending"), time(0));
  store = updateTiming(store, tasks("in-progress"), time(1));
  store = updateTiming(store, tasks("done"), time(31));
  store = updateTiming(store, tasks("in-progress"), time(40));
  assert.equal(Object.values(store)[0].inProgressMs, 0);
  assert.equal(Object.values(store)[0].completedAt, undefined);
  store = updateTiming(store, tasks("cancelled"), time(50));
  assert.equal(Object.values(store)[0].completedAt, time(50));
  assert.equal(Object.values(store)[0].partial, true);
});
test("duration labels handle unknown and short durations", () => {
  assert.equal(duration(null), "—");
  assert.equal(duration(30000), "<1 min");
  assert.equal(duration(60000), "1 min");
  assert.equal(duration(5400000), "1 hr 30 min");
});
