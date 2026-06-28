/**
 * Centralized notification sound system for LuxeDine POS.
 * Uses the Web Audio API to generate distinct tones programmatically —
 * no external audio files needed, works offline, and is browser-compatible.
 */

let audioCtx: AudioContext | null = null;
let unlocked = false;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

/** Resume AudioContext after user gesture (required by browsers). */
export function unlockAudio() {
  if (unlocked) return;
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    unlocked = true;
  } catch {
    // Audio API not available
  }
}

/**
 * Play a synthesized tone sequence.
 * @param frequencies Array of [frequency, durationMs] pairs
 * @param type OscillatorType
 * @param volume 0-1
 */
function playTones(
  frequencies: [number, number][],
  type: OscillatorType = 'sine',
  volume: number = 0.3
) {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    let startTime = ctx.currentTime;

    frequencies.forEach(([freq, durationMs]) => {
      const duration = durationMs / 1000;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, startTime);

      // Smooth attack and release to avoid clicks
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration - 0.02);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);

      startTime += duration;
    });
  } catch {
    // Audio API not available (SSR or unsupported browser)
  }
}

/**
 * Play overlapping tones with specific start offsets and exponential decay (ADSR envelope).
 * This generates premium, organic bell and chime sounds suitable for modern SaaS apps.
 */
function playChime(
  tones: { freq: number; durationMs: number; delayMs: number }[],
  type: OscillatorType = 'sine',
  volume: number = 0.3
) {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const baseTime = ctx.currentTime;

    tones.forEach(({ freq, durationMs, delayMs }) => {
      const duration = durationMs / 1000;
      const delay = delayMs / 1000;
      const startTime = baseTime + delay;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, startTime);

      // Smooth attack (fast ramp) and natural exponential decay
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  } catch {
    // Audio API not available
  }
}

export type SoundType = 'newOrder' | 'serviceRequest' | 'statusUpdate' | 'orderComplete';

/**
 * Play a distinct notification sound for each event type.
 */
export function playNotificationSound(type: SoundType) {
  switch (type) {
    case 'newOrder':
      // Loud, bright Swiggy/Zomato style restaurant alert arpeggio (high-pitched triangle wave)
      playChime([
        { freq: 523.25, durationMs: 1200, delayMs: 0 },   // C5
        { freq: 659.25, durationMs: 1200, delayMs: 100 },  // E5
        { freq: 783.99, durationMs: 1200, delayMs: 200 },  // G5
        { freq: 1046.50, durationMs: 1500, delayMs: 300 }, // C6
        
        { freq: 523.25, durationMs: 1200, delayMs: 650 },   // C5 repeat
        { freq: 659.25, durationMs: 1200, delayMs: 750 },   // E5 repeat
        { freq: 783.99, durationMs: 1200, delayMs: 850 },   // G5 repeat
        { freq: 1046.50, durationMs: 1800, delayMs: 950 }   // C6 ring out
      ], 'triangle', 0.85);
      break;

    case 'serviceRequest':
      // Loud, clear double-tap alert for customer table requests
      playChime([
        { freq: 987.77, durationMs: 600, delayMs: 0 },   // B5
        { freq: 987.77, durationMs: 600, delayMs: 120 }, // B5 double tap
        { freq: 783.99, durationMs: 1000, delayMs: 240 }  // G5 ring out
      ], 'triangle', 0.7);
      break;

    case 'statusUpdate':
      // Crisp single ping for status check
      playChime([
        { freq: 880.00, durationMs: 500, delayMs: 0 }    // A5
      ], 'triangle', 0.65);
      break;

    case 'orderComplete':
      // Beautiful harmonic success chime: ascending positive interval chord
      playChime([
        { freq: 523.25, durationMs: 600, delayMs: 0 },   // C5
        { freq: 659.25, durationMs: 600, delayMs: 80 },  // E5
        { freq: 783.99, durationMs: 600, delayMs: 160 }, // G5
        { freq: 1046.50, durationMs: 1200, delayMs: 240 } // C6
      ], 'triangle', 0.7);
      break;
  }
}
