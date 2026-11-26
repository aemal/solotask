import test from 'node:test';
import assert from 'node:assert/strict';
import { startRingback } from '../components/vision/ringback';

test('ringback schedules a quiet double ring and closes audio on stop', async () => {
  const original = globalThis.AudioContext;
  const frequencies: number[] = [], starts: number[] = [];
  let closes = 0;
  class Audio {
    state = 'running'; currentTime = 10; destination = {};
    resume() { return Promise.resolve(); }
    close() { this.state = 'closed'; closes++; return Promise.resolve(); }
    createGain() { return { connect() {}, disconnect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime(value: number) { assert.ok(value <= .035); } } }; }
    createOscillator() { const tone = { frequency: { value: 0 }, connect() {}, disconnect() {}, start(time: number) { starts.push(time); frequencies.push(tone.frequency.value); }, stop() {}, onended: null }; return tone; }
  }
  globalThis.AudioContext = Audio as unknown as typeof AudioContext;
  let stop = () => {};
  try {
    stop = startRingback(); await Promise.resolve();
    assert.deepEqual(frequencies, [440, 480, 440, 480]);
    assert.deepEqual(starts, [10, 10, 10.48, 10.48]);
    stop(); stop(); assert.equal(closes, 1);
  } finally { stop(); globalThis.AudioContext = original; }
});

test('blocked or unavailable audio never prevents a call', () => {
  const original = globalThis.AudioContext;
  globalThis.AudioContext = class { constructor() { throw new Error('Audio unavailable'); } } as unknown as typeof AudioContext;
  try { assert.doesNotThrow(() => startRingback()()); }
  finally { globalThis.AudioContext = original; }
});
