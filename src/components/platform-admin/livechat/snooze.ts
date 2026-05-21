// Klient-side "snooze" for livechat-samtaler. Vi gemmer en deadline pr.
// samtale i localStorage — når den er overskredet dukker samtalen op igen
// af sig selv. Det er bevidst client-side: admins arbejder typisk fra én
// maskine ad gangen og snooze er en personlig præference, ikke et team-
// signal. Hvis vi senere vil dele snooze på tværs, flytter vi nøglen til
// en `admin_chat_snoozes`-tabel uden at ændre call-sites.

const KEY = "serviceydere_admin_chat_snooze_v1";

type SnoozeMap = Record<string, string>; // conversation_id -> ISO deadline

const read = (): SnoozeMap => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const write = (map: SnoozeMap) => {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent("serviceydere:chat-snooze")); } catch { /* ignore */ }
};

export const snoozeUntil = (conversationId: string, hours: number) => {
  const map = read();
  map[conversationId] = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  write(map);
};

export const unsnooze = (conversationId: string) => {
  const map = read();
  delete map[conversationId];
  write(map);
};

/** Returnerer kun samtaler som stadig er snoozed (deadline i fremtiden). */
export const getActiveSnoozes = (): SnoozeMap => {
  const now = Date.now();
  const map = read();
  let changed = false;
  for (const [id, iso] of Object.entries(map)) {
    if (new Date(iso).getTime() <= now) {
      delete map[id];
      changed = true;
    }
  }
  if (changed) write(map);
  return map;
};

export const subscribeToSnoozes = (cb: () => void) => {
  const h = () => cb();
  window.addEventListener("serviceydere:chat-snooze", h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener("serviceydere:chat-snooze", h);
    window.removeEventListener("storage", h);
  };
};
