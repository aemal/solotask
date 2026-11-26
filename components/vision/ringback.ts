/** Quiet, local ringback; never sent to the conversation provider. */
export function startRingback(): () => void {
  let context: AudioContext | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let stopped = false;
  const stop = () => {
    stopped = true;
    if (timer) clearInterval(timer);
    if (context && context.state !== "closed") void context.close().catch(() => {});
  };
  try {
    context = new AudioContext();
    const audio = context;
    const pulse = () => {
      if (stopped || audio.state !== "running") return;
      const now = audio.currentTime;
      for (const offset of [0, 0.48]) {
        const gain = audio.createGain();
        gain.connect(audio.destination);
        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.035, now + offset + 0.025);
        gain.gain.setValueAtTime(0.035, now + offset + 0.3);
        gain.gain.linearRampToValueAtTime(0, now + offset + 0.36);
        const tones = [440, 480].map(frequency => {
          const tone = audio.createOscillator();
          tone.frequency.value = frequency;
          tone.connect(gain);
          tone.start(now + offset);
          tone.stop(now + offset + 0.38);
          return tone;
        });
        tones[1].onended = () => { tones.forEach(tone => tone.disconnect()); gain.disconnect(); };
      }
    };
    void audio.resume().then(() => {
      if (stopped) return;
      pulse();
      timer = setInterval(pulse, 2600);
    }).catch(stop);
  } catch { stop(); }
  return stop;
}
