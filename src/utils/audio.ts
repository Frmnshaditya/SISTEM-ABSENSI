/**
 * Web Audio API synthesizer helper for scan notifications
 */

// Global AudioContext cache
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a high-pitched aesthetic success "Chime" (double synth ping)
 */
export function playSuccessSound() {
  try {
    const ctx = getAudioContext();
    const time = ctx.currentTime;

    // First note
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, time); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, time + 0.1); // A5

    gain1.gain.setValueAtTime(0.15, time);
    gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(time);
    osc1.stop(time + 0.35);

    // Second overlapping note
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, time + 0.08); // A5
    osc2.frequency.exponentialRampToValueAtTime(1174.66, time + 0.22); // D6

    gain2.gain.setValueAtTime(0.12, time + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(time + 0.08);
    osc2.stop(time + 0.5);
  } catch (error) {
    console.warn("Natively synthesized success audio was blocked or failed:", error);
  }
}

/**
 * Play an administrative error buzz (low-pitched flat double alarm vibe)
 */
export function playErrorSound() {
  try {
    const ctx = getAudioContext();
    const time = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.setValueAtTime(110, time + 0.12);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.linearRampToValueAtTime(0.08, time + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    // Dynamic bandpass filter to make it sound a bit retro-digital but soft
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(300, time);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.3);
  } catch (error) {
    console.warn("Natively synthesized error audio was blocked or failed:", error);
  }
}

/**
 * Play an administrative warning sound (medium alert bell)
 */
export function playWarningSound() {
  try {
    const ctx = getAudioContext();
    const time = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, time); // A4
    osc.frequency.exponentialRampToValueAtTime(220, time + 0.3);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.35);
  } catch (error) {
    console.warn("Natively synthesized warning audio was blocked or failed:", error);
  }
}
