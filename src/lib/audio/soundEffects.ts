/**
 * Web Audio API procedural sound generator
 * Synthesizes a subtle, realistic paper page-turn sound with zero external audio assets.
 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playPageTurnSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Buffer of white noise
    const bufferSize = ctx.sampleRate * 0.12; // 120ms duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Noise with gentle decay
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter to mimic paper friction texture
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, ctx.currentTime);
    filter.Q.setValueAtTime(1.8, ctx.currentTime);

    // Gain envelope
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start();
  } catch (e) {
    console.debug('Paper turn audio effect could not play:', e);
  }
}
