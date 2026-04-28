// Lille klient-side "register" der holder styr på alle livechat-samtaler
// brugeren har på enheden — på tværs af platform-support og forskellige
// virksomheders egne livechats. Bruges af widgeterne til at vise en samlet
// "Mine samtaler"-liste, så brugeren nemt kan skifte mellem fx samtale med
// Serviceydere support og samtale med en konkret virksomhed.
//
// Vi gemmer KUN session-token + lidt kontekst (navn, billede, scope) i
// localStorage. Selve beskederne hentes altid fra databasen via tokenet.

export type ChatScope = "platform" | "business";

export type RegisteredChat = {
  /** Unik nøgle: `platform` eller `business:<id>` */
  key: string;
  scope: ChatScope;
  /** business_id når scope === "business" */
  businessId?: string;
  /** Visningsnavn (fx "Serviceydere support" eller virksomhedsnavn) */
  label: string;
  /** Logo-url for virksomhed (valgfrit) */
  logoUrl?: string | null;
  /** Sidste gang vi så aktivitet — bruges til sortering */
  lastActiveAt: string;
  /** Direkte link til virksomhedsside (kun for business) */
  href?: string;
};

const REGISTRY_KEY = "serviceydere_chat_registry_v1";

const safeRead = (): RegisteredChat[] => {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const safeWrite = (list: RegisteredChat[]) => {
  try { localStorage.setItem(REGISTRY_KEY, JSON.stringify(list)); } catch {}
  try { window.dispatchEvent(new CustomEvent("serviceydere:chat-registry")); } catch {}
};

export const listChats = (): RegisteredChat[] =>
  safeRead().sort((a, b) => (b.lastActiveAt || "").localeCompare(a.lastActiveAt || ""));

export const upsertChat = (entry: Omit<RegisteredChat, "lastActiveAt"> & { lastActiveAt?: string }) => {
  const list = safeRead();
  const idx = list.findIndex((c) => c.key === entry.key);
  const next: RegisteredChat = {
    ...entry,
    lastActiveAt: entry.lastActiveAt || new Date().toISOString(),
  };
  if (idx === -1) list.push(next);
  else list[idx] = { ...list[idx], ...next };
  safeWrite(list);
};

export const removeChat = (key: string) => {
  const list = safeRead().filter((c) => c.key !== key);
  safeWrite(list);
};

export const subscribeToRegistry = (cb: () => void) => {
  const handler = () => cb();
  window.addEventListener("serviceydere:chat-registry", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("serviceydere:chat-registry", handler);
    window.removeEventListener("storage", handler);
  };
};

export const platformKey = () => "platform";
export const businessKey = (businessId: string) => `business:${businessId}`;
