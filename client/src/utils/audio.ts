/**
 * ═══════════════════════════════════════════════════════════════
 *  Audio Synthesizer Utility (Web Audio API)
 *  Futuristic sound effects with zero external file dependencies.
 * ═══════════════════════════════════════════════════════════════
 */

let audioCtx: AudioContext | null = null;
let isMuted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function toggleMute(muted?: boolean): boolean {
  if (typeof muted === 'boolean') {
    isMuted = muted;
  } else {
    isMuted = !isMuted;
  }
  try {
    localStorage.setItem('attendance_audio_muted', isMuted ? 'true' : 'false');
  } catch {
    // Ignore storage errors
  }
  return isMuted;
}

export function getMuteState(): boolean {
  try {
    const stored = localStorage.getItem('attendance_audio_muted');
    if (stored !== null) isMuted = stored === 'true';
  } catch {
    // Ignore
  }
  return isMuted;
}

/**
 * Play high-tech positive verification chime
 */
export function playSuccessChime() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  // Futuristic ascending chord (E5 -> B5)
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(659.25, now); // E5
  osc1.frequency.exponentialRampToValueAtTime(987.77, now + 0.12); // B5

  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(1318.51, now + 0.08); // E6
  osc2.frequency.exponentialRampToValueAtTime(1975.53, now + 0.28); // B6

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now + 0.05);
  osc1.stop(now + 0.45);
  osc2.stop(now + 0.45);
}

/**
 * Play subtle radar blip / sonar ping
 */
export function playRadarPing() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now); // A5
  osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08); // A6

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.16);
}

/**
 * Play gentle error tone
 */
export function playErrorTone() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.linearRampToValueAtTime(160, now + 0.25);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.3);
}
