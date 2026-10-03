/* Lydpakke til medarbejderens rutekørsel.
   Hver hændelse har sin egen genkendelige "signatur" (tonehøjde + rytme) og
   et matchende vibrationsmønster, så medarbejderen lærer lydene at kende uden
   at kigge på skærmen. Bløde klokketoner via Web Audio — ingen stemme. */

let audioCtx: AudioContext | null = null;
let unlocked = false;
let master: GainNode | null = null;

const getCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    audioCtx = new Ctx();
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

const vibrate = (pattern: number | number[]) => {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch { /* ignorér */ }
};

/* Undgå at samme lyd spilles flere gange lige efter hinanden (GPS-jitter). */
const lastAt: Record<string, number> = {};
const gate = (name: string, gapMs = 1500) => {
  if (!unlocked) return false;
  const now = Date.now();
  if (now - (lastAt[name] ?? 0) < gapMs) return false;
  lastAt[name] = now;
  return true;
};

/** Klokketone: grundtone + svage overtoner med eksponentiel udklingning. */
const bell = (freq: number, delayMs = 0, durationMs = 600, volume = 0.14, soft = false) => {
  const ctx = getCtx();
  if (!ctx || !master) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const t = ctx.currentTime + delayMs / 1000;
  const end = t + durationMs / 1000;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(volume, t + (soft ? 0.04 : 0.012));
  out.gain.exponentialRampToValueAtTime(0.0001, end);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = soft ? 2400 : 4200;
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

/** Drej forude: to korte, ens "tik" — "vær opmærksom". */
export const playTurnCue = () => {
  if (!gate("turn", 4000)) return;
  bell(880, 0, 160, 0.08);
  bell(880, 170, 200, 0.08);
  vibrate([20, 80, 20]);
};

/** Tæt på stoppet (~300 m): rolig opadgående tone — "gør dig klar". */
export const playApproachCue = () => {
  if (!gate("approach", 10000)) return;
  bell(587.33, 0, 420, 0.1, true); // D5
  bell(739.99, 180, 520, 0.1, true); // F#5
  vibrate(30);
};

/** Ankommet: tre stigende toner — genkendelig "du er her". */
export const playArrivalChime = () => {
  if (!gate("arrival", 5000)) return;
  bell(659.25, 0, 480, 0.12);   // E5
  bell(830.61, 130, 520, 0.12); // G#5
  bell(987.77, 260, 800, 0.12); // B5
  vibrate([40, 70, 40, 70, 80]);
};

/** Tidsregistrering startet: enkelt dæmpet tone. */
export const playStartChime = () => {
  if (!gate("start", 1000)) return;
  bell(783.99, 0, 420, 0.1); // G5
  vibrate(18);
};

/** Stop udført: lyst "ding-ding" — klar bekræftelse. */
export const playSuccessChime = () => {
  if (!gate("success", 1000)) return;
  bell(1046.5, 0, 340, 0.11);   // C6
  bell(1567.98, 110, 600, 0.1); // G6
};

/** Fortryd udførsel: nedadgående, blød tone. */
export const playUndoChime = () => {
  if (!gate("undo", 1000)) return;
  bell(783.99, 0, 260, 0.08, true);
  bell(587.33, 120, 420, 0.08, true);
  vibrate(14);
};

/** Genberegner rute: lav, blød dobbelttone — "ruten ændrer sig". */
export const playRerouteCue = () => {
  if (!gate("reroute", 8000)) return;
  bell(493.88, 0, 300, 0.09, true); // B4
  bell(440, 160, 420, 0.09, true);  // A4
  vibrate([25, 60, 25]);
};

/** Trafik forude: tre korte, dybe toner. */
export const playTrafficCue = () => {
  if (!gate("traffic", 30000)) return;
  [0, 200, 400].forEach((d) => bell(392, d, 180, 0.08, true));
  vibrate([20, 60, 20, 60, 20]);
};

/** Hele ruten kørt: blid arpeggio der klinger ud. */
export const playCompleteFanfare = () => {
  if (!gate("complete", 3000)) return;
  bell(523.25, 0, 900, 0.1);
  bell(659.25, 120, 900, 0.1);
  bell(783.99, 240, 1000, 0.1);
  bell(1046.5, 380, 1400, 0.11);
};

/** Afspil en lyd fra lydoversigten (for at lære dem at kende). */
export const previewCue = (name: "turn" | "approach" | "arrival" | "success" | "reroute" | "complete") => {
  unlockAudio();
  delete lastAt[name];
  ({ turn: playTurnCue, approach: playApproachCue, arrival: playArrivalChime, success: playSuccessChime, reroute: playRerouteCue, complete: playCompleteFanfare })[name]();
};

/** Oplæsning er fjernet — beholdes som no-op for kompatibilitet. */
export const speak = (_text: string) => {};

export const stopSpeaking = () => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
};
