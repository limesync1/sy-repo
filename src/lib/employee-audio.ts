/* Lille lydbibliotek til medarbejder-appen.
   Bruger Web Audio API til chimes (intet ekstra netværkskald),
   og Web Speech API til kort talebesked (afspilles kun hvis browseren
   understøtter det og brugeren har aktiveret lyd ved første interaktion). */

let audioCtx: AudioContext | null = null;
let unlocked = false;

const getCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    audioCtx = new Ctx();
    return audioCtx;
  } catch {
    return null;
  }
};

/** Skal kaldes ved første brugerklik for at låse audio op (autoplay-regler). */
export const unlockAudio = () => {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  unlocked = true;
};

const playTone = (freq: number, durationMs: number, volume = 0.18, type: OscillatorType = "sine", delayMs = 0) => {
  const ctx = getCtx();
  if (!ctx) return;
  const start = ctx.currentTime + delayMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.02);
  gain.gain.linearRampToValueAtTime(0, start + durationMs / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + durationMs / 1000 + 0.05);
};

/** Kort blød chime (to-tonet) — bruges når medarbejder er ankommet til et stop. */
export const playArrivalChime = () => {
  if (!unlocked) return;
  playTone(880, 250, 0.18, "sine", 0);
  playTone(1320, 350, 0.18, "sine", 180);
};

/** Lille positiv "ding" — bruges når et stop markeres som udført. */
export const playSuccessChime = () => {
  if (!unlocked) return;
  playTone(1046, 120, 0.16, "sine", 0);    // C6
  playTone(1318, 200, 0.16, "sine", 100);  // E6
};

/** Glad fanfare — bruges når dagens sidste stop er klaret. */
export const playCompleteFanfare = () => {
  if (!unlocked) return;
  playTone(523, 160, 0.18, "triangle", 0);     // C5
  playTone(659, 160, 0.18, "triangle", 140);   // E5
  playTone(784, 160, 0.18, "triangle", 280);   // G5
  playTone(1046, 380, 0.2, "triangle", 420);   // C6
};

/** Læs en kort dansk besked højt (Web Speech API). Failer stille hvis ikke tilgængeligt. */
export const speak = (text: string) => {
  if (!unlocked) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "da-DK";
    u.rate = 1.0;
    u.pitch = 1.0;
    u.volume = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
};
/** Stop al igangværende/kø-lagt tale med det samme. Bruges når skærmen
 *  slukkes eller guiden genoptages, så gamle instruktioner ikke afspilles. */
export const stopSpeaking = () => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
};
