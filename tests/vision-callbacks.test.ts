import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CallbackQueue, callbackOpening } from "../lib/vision-callbacks";
async function fixture(fn: (root: string) => Promise<void>) { const root = await mkdtemp(path.join(tmpdir(), "vision-callback-")); try { await fn(root); } finally { await rm(root, {recursive:true,force:true}); } }
test("callback retains context, waits sixty seconds, and deduplicates repeated requests", () => fixture(async root => {
  let now = 1000000, calls = 0;
  const q = new CallbackQueue(root, () => now, async job => { calls++; assert.equal(job.summary,"the resend invitation fix"); });
  const a = await q.schedule("conversation-1", "the resend invitation fix");
  assert.equal((await q.schedule("conversation-1", "changed")).id,a.id);
  now += 59999; await q.tick(); assert.equal(calls,0);
  now++; await q.tick(); await q.tick(); assert.equal(calls,1); assert.equal((await q.read(a.id)).status,"initiated");
  assert.match(callbackOpening(a.summary),/resend invitation fix is done/);
}));
test("cancelled and overdue callbacks never dial", () => fixture(async root => {
  let now=1000000,calls=0; const q=new CallbackQueue(root,()=>now,async()=>{calls++;});
  const a=await q.schedule("conversation-2","QA review"); await q.cancel(a.id);
  const b=await q.schedule("conversation-3","UX fix"); now+=181000; await q.tick();
  assert.equal(calls,0); assert.equal((await q.read(b.id)).status,"expired");
}));
test("uncertain network result is never automatically retried, including after restart", () => fixture(async root => {
  let now=1000000,calls=0; const dispatch=async()=>{calls++;throw new Error("timeout");};
  const q=new CallbackQueue(root,()=>now,dispatch); const a=await q.schedule("conversation-4","deployment preview");
  now+=60000;await q.tick(); await new CallbackQueue(root,()=>now,dispatch).tick();
  assert.equal(calls,1);assert.equal((await q.read(a.id)).status,"unknown");
}));
test("daily call cap and invalid input are enforced", () => fixture(async root => {
  const q=new CallbackQueue(root); for(let i=0;i<5;i++) await q.schedule(`conversation-${i}`,"demo task");
  await assert.rejects(q.schedule("conversation-6","demo task"),/five/);
  await assert.rejects(q.schedule("..","demo task"));
  await assert.rejects(q.schedule("conversation-7"," "));
}));
