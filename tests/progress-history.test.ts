import { test } from "node:test";
import assert from "node:assert/strict";
import { progressDelta, recordProgress, type ProgressSample } from "../lib/progress-history";
const sample = (at: number, completed: number, total = 10): ProgressSample => ({ at, groups: { "*/0": { total, completed }, "tag:master/1": { total: 4, completed: completed * 2 } } });
const history = Array.from({ length: 21 }, (_, i) => sample(i * 30000, i === 20 ? 3 : 1));
test("ten minute delta uses percentage points and separate task/subtask scope", () => {
  assert.equal(progressDelta(history, "all", 0, 600000)?.points, 20);
  assert.equal(progressDelta(history, "master", 1, 600000)?.points, 100);
  assert.equal(progressDelta(history.slice(1), "all", 0, 600000), null);
});
test("stale or interrupted observations never imply no progress", () => {
  assert.equal(progressDelta([sample(0, 1), sample(600000, 3)], "all", 0, 600000), null);
  assert.equal(progressDelta(history, "all", 0, 800000), null);
});
test("flat, regressing, and changed denominators are represented honestly", () => {
  assert.equal(progressDelta(history.map(s => sample(s.at, 1)), "all", 0, 600000)?.points, 0);
  const changed = [...history.slice(0, -1), sample(600000, 1, 20)];
  assert.equal(progressDelta(changed, "all", 0, 600000)?.points, -5);
  assert.equal(progressDelta(changed, "all", 0, 600000)?.totalChanged, true);
});
test("sampling is bounded and does not append on every poll", () => {
  assert.equal(recordProgress([sample(10000, 1)], [], 20000).length, 1);
  assert.equal(recordProgress([sample(0, 1)], [], 12000000).length, 1);
});
test("each requested window uses its own baseline and collects independently", () => {
  const now = 10800000;
  const samples = Array.from({length:361}, (_,i)=>sample(i*30000, i/360, 10));
  for (const minutes of [10,30,60,180]) {
    const result=progressDelta(samples,'all',0,now,minutes*60000);
    assert.ok(result);
    assert.ok(Math.abs(result.points-minutes/18)<1e-9);
  }
  const short=samples.filter(s=>s.at>=now-600000);
  assert.ok(progressDelta(short,'all',0,now,600000));
  assert.equal(progressDelta(short,'all',0,now,1800000),null);
});
test("long windows reject gaps even when the ten-minute window is continuous", () => {
  const now=10800000;
  const samples=Array.from({length:361},(_,i)=>sample(i*30000,1)).filter(s=>s.at<6000000||s.at>6200000);
  assert.ok(progressDelta(samples,'all',0,now,600000));
  assert.equal(progressDelta(samples,'all',0,now,10800000),null);
});
test("retention keeps three-hour baselines and remains count bounded", () => {
  const now=10800000;
  const samples=Array.from({length:361},(_,i)=>sample(i*30000,1));
  const recorded=recordProgress(samples,[],now);
  assert.equal(recorded[0].at,0);
  assert.equal(recordProgress([sample(0,1)],[],now+120001).length,1);
  assert.ok(recordProgress(Array.from({length:1000},(_,i)=>sample(now-i,1)),[],now).length<=365);
});
