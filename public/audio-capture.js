// Resample continuously with fractional phase preserved across audio render blocks.
class VoiceCapture extends AudioWorkletProcessor {
  constructor() { super(); this.phase = 0; this.samples = []; this.port.onmessage = event => { if (event.data === "flush") { if (this.samples.length) { const pcm = new Int16Array(this.samples); this.samples = []; this.port.postMessage(pcm, [pcm.buffer]); } this.port.postMessage("flushed"); } }; }
  process(inputs) {
    const channels = inputs[0];
    if (!channels?.length) return true;
    const block = channels[0];
    for (let i = 0; i < block.length; i++) {
      this.phase += 16000;
      if (this.phase >= sampleRate) {
        this.phase -= sampleRate;
        let value = 0;
        for (const channel of channels) value += channel[i] / channels.length;
        this.samples.push(Math.max(-32768, Math.min(32767, Math.round(value * 32768))));
      }
    }
    if (this.samples.length >= 1600) {
      const pcm = new Int16Array(this.samples); this.samples = [];
      this.port.postMessage(pcm, [pcm.buffer]);
    }
    return true;
  }
}
registerProcessor("vibeboard-voice", VoiceCapture);
