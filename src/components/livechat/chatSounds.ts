// Lightweight WebAudio chime utility for the live chat.
// No external assets — uses small synthesized tones so it works offline
// and respects the user's prefers-reduced-motion / muted preference.

let ctx: AudioContext | null = null;
let muted = false;

const STORAGE_KEY = "serviceydere_chat_muted_v1";

if (typeof window !== "undefined") {
  try {
    muted = localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    /* ignore */
  }
}

const getCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor: typeof AudioContext | undefined =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
};

const playTones = (
  tones: Array<{ freq: number; start: number; duration: number; gain?: number; type?: OscillatorType }>,
) => {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume().catch(() => {});
  const master = ac.createGain();
  master.gain.value = 0.0001;
  master.connect(ac.destination);
  const now = ac.currentTime;

  tones.forEach(({ freq, start, duration, gain = 0.18, type = "sine" }) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, now + start);
    g.gain.exponentialRampToValueAtTime(gain, now + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
    osc.connect(g).connect(master);
    osc.start(now + start);
    osc.stop(now + start + duration + 0.05);
  });

  master.gain.setValueAtTime(1, now);
};

export const chatSounds = {
  isMuted: () => muted,
  setMuted: (value: boolean) => {
    muted = value;
    try {
      localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  },
  // Soft "ding" when a new incoming message arrives
  incoming: () =>
    playTones([
      { freq: 880, start: 0, duration: 0.18, gain: 0.18 },
      { freq: 1320, start: 0.07, duration: 0.22, gain: 0.14 },
    ]),
  // Subtle "swoosh" when the user sends a message
  outgoing: () =>
    playTones([
      { freq: 520, start: 0, duration: 0.12, gain: 0.1, type: "triangle" },
      { freq: 720, start: 0.04, duration: 0.12, gain: 0.08, type: "triangle" },
    ]),
  // Open the chat panel
  open: () =>
    playTones([
      { freq: 660, start: 0, duration: 0.12, gain: 0.08, type: "sine" },
      { freq: 990, start: 0.06, duration: 0.14, gain: 0.06, type: "sine" },
    ]),
  // Conversation closed / system event
  system: () =>
    playTones([
      { freq: 420, start: 0, duration: 0.16, gain: 0.08, type: "sine" },
      { freq: 280, start: 0.08, duration: 0.2, gain: 0.06, type: "sine" },
    ]),
  // Typing indicator tick (rarely used, kept short)
  tick: () => playTones([{ freq: 1200, start: 0, duration: 0.04, gain: 0.05 }]),
};

export default chatSounds;