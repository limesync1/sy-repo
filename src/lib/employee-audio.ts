/* Lille lydbibliotek til medarbejder-appen.
   Bløde, korte lyde lavet med Web Audio API (intet netværkskald).
   Der bruges ingen oplæsning/stemme. */

let audioCtx: AudioContext | null = null;
let unlocked = false;
let master: GainNode | null = null;

const getCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    audioCtx = new Ctx();
    // Blød kompressor + master, så lyde aldrig bliver skarpe eller klipper.
    const comp = audioCtx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 4;
    master = audioCtx.createGain();
    master.gain.value = 0.7;
    master.connect(comp).connect(audioCtx.destination);
    return audioCtx;
  } catch {
    return null;
  }
};

export const unlockAudio = () => {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  unlocked = true;
};

/** Klokkeagtig tone: grundtone + svag overtone med eksponentiel udklingning. */
const bell = (freq: number, delayMs = 0, durationMs = 600, volume = 0.14) => {
  const ctx = getCtx();
  if (!ctx || !master) return;
  const t = ctx.currentTime + delayMs / 1000;
  const end = t + durationMs / 1000;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(volume, t + 0.012);
  out.gain.exponentialRampToValueAtTime(0.0001, end);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 4200;
  out.connect(lp).connect(master);
  [[1, 1], [2, 0.18], [3.01, 0.06]].forEach(([mult, amp]) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq * mult, t);
    g.gain.value = amp;
    o.connect(g).connect(out);
    o.start(t);
    o.stop(end + 0.05);
  });
};

/** Ankommet til stop: rolig, opadgående to-tone. */
export const playArrivalChime = () => {
  if (!unlocked) return;
  bell(659.25, 0, 520, 0.12);   // E5
  bell(987.77, 140, 700, 0.11); // B5
};

/** Stop udført: kort, lys bekræftelse. */
export const playSuccessChime = () => {
  if (!unlocked) return;
  bell(1046.5, 0, 380, 0.11);  // C6
  bell(1567.98, 90, 520, 0.09); // G6
};

/** Tidsregistrering startet: dæmpet enkelt "tik". */
export const playStartChime = () => {
  if (!unlocked) return;
  bell(783.99, 0, 420, 0.1); // G5
};

/** Hele ruten kørt: blid arpeggio der klinger ud. */
export const playCompleteFanfare = () => {
  if (!unlocked) return;
  bell(523.25, 0, 900, 0.1);    // C5
  bell(659.25, 120, 900, 0.1);  // E5
  bell(783.99, 240, 1000, 0.1); // G5
  bell(1046.5, 380, 1400, 0.11); // C6
};

/** Oplæsning er fjernet — beholdes som no-op for kompatibilitet. */
export const speak = (_text: string) => {};

export const stopSpeaking = () => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
};
