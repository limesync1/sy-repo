// Lightweight WebAudio chime utility for the livechat.
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

// --- Analytics + edge-case dedupe -------------------------------------------
// Beskeder kan nå frem ad tre veje (realtime, polling og AI-svaret), så udover
// id-baseret dedupe i widget'en har vi et sidste værn her: samme lydtype kan
// ikke afspilles to gange inden for et kort vindue. Alt logges i en lille
// ringbuffer, så vi kan se hvor og hvornår lyden faktisk blev afspillet.

type SoundName = "incoming" | "outgoing" | "open" | "system" | "tick";
type SoundLogEntry = {
  at: number;
  sound: SoundName;
  source: string;
  played: boolean;
  reason?: "muted" | "throttled" | "no-audio";
};

const MIN_GAP_MS = 400;
const lastPlayedAt: Partial<Record<SoundName, number>> = {};
const log: SoundLogEntry[] = [];

const record = (entry: SoundLogEntry) => {
  log.push(entry);
  if (log.length > 200) log.splice(0, log.length - 200);
  if (typeof window !== "undefined") (window as any).__chatSoundLog = log;
};

const playTones = (
  name: SoundName,
  source: string,
  tones: Array<{ freq: number; start: number; duration: number; gain?: number; type?: OscillatorType }>,
) => {
  const now = Date.now();
  if (muted) {
    record({ at: now, sound: name, source, played: false, reason: "muted" });
    return;
  }
  if (now - (lastPlayedAt[name] ?? 0) < MIN_GAP_MS) {
    record({ at: now, sound: name, source, played: false, reason: "throttled" });
    return;
  }
  const ac = getCtx();
  if (!ac) {
    record({ at: now, sound: name, source, played: false, reason: "no-audio" });
    return;
  }
  lastPlayedAt[name] = now;
  record({ at: now, sound: name, source, played: true });
  if (ac.state === "suspended") ac.resume().catch(() => {});
  const master = ac.createGain();
  master.gain.value = 0.0001;
  master.connect(ac.destination);
  const t0 = ac.currentTime;

  tones.forEach(({ freq, start, duration, gain = 0.18, type = "sine" }) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0 + start);
    g.gain.exponentialRampToValueAtTime(gain, t0 + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + duration);
    osc.connect(g).connect(master);
    osc.start(t0 + start);
    osc.stop(t0 + start + duration + 0.05);
  });

  master.gain.setValueAtTime(1, t0);
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
  /** Seneste lyd-hændelser (til fejlfinding af dobbelt-afspilning). */
  getLog: () => [...log],
  /**
   * Sammentælling af lyd-hændelser i sessionen: hvor mange der faktisk blev
   * afspillet, og hvor mange der blev stoppet af dedupe/throttle. Sendes med
   * som telemetri, så dobbelt-afspilning kan korreleres med AI-svar.
   */
  stats: () => ({
    played: log.filter((e) => e.played).length,
    deduped: log.filter((e) => !e.played && e.reason === "throttled").length,
  }),
  // Soft "ding" when a new incoming message arrives
  incoming: (source = "unknown") =>
    playTones("incoming", source, [
      { freq: 880, start: 0, duration: 0.18, gain: 0.18 },
      { freq: 1320, start: 0.07, duration: 0.22, gain: 0.14 },
    ]),
  // Subtle "swoosh" when the user sends a message
  outgoing: (source = "unknown") =>
    playTones("outgoing", source, [
      { freq: 520, start: 0, duration: 0.12, gain: 0.1, type: "triangle" },
      { freq: 720, start: 0.04, duration: 0.12, gain: 0.08, type: "triangle" },
    ]),
  // Open the chat panel
  open: (source = "unknown") =>
    playTones("open", source, [
      { freq: 660, start: 0, duration: 0.12, gain: 0.08, type: "sine" },
      { freq: 990, start: 0.06, duration: 0.14, gain: 0.06, type: "sine" },
    ]),
  // Conversation closed / system event
  system: (source = "unknown") =>
    playTones("system", source, [
      { freq: 420, start: 0, duration: 0.16, gain: 0.08, type: "sine" },
      { freq: 280, start: 0.08, duration: 0.2, gain: 0.06, type: "sine" },
    ]),
  // Typing indicator tick (rarely used, kept short)
  tick: (source = "unknown") => playTones("tick", source, [{ freq: 1200, start: 0, duration: 0.04, gain: 0.05 }]),
};


export default chatSounds;