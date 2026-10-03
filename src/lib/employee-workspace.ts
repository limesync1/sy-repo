// employee-workspace
// ------------------
// En bruger kan være medarbejder hos flere virksomheder. Her gemmes hvilken
// virksomhed medarbejderpanelet aktuelt viser.
//   • localStorage  → brugeren har valgt "husk mit valg" (gælder fremover)
//   • sessionStorage → kun for den aktuelle fane/session
const KEY = "sy.employee.business_id";

const read = (store: Storage | undefined): string | null => {
  try {
    return store?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
};

export const getEmployeeWorkspace = (): string | null => {
  if (typeof window === "undefined") return null;
  return read(window.localStorage) ?? read(window.sessionStorage);
};

export const setEmployeeWorkspace = (businessId: string, remember: boolean) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, businessId);
    if (remember) window.localStorage.setItem(KEY, businessId);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  notifyEmployeeWorkspace();
};

export const clearEmployeeWorkspace = () => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  notifyEmployeeWorkspace();
};

// Reaktivt abonnement, så alle hooks skifter medarbejder-record med det
// samme, når arbejdspladsen vælges — ellers bliver data hentet for den
// forkerte virksomhed (fx tom tidsregistrering og "0 ruter").
const EVENT = "sy-employee-workspace";
export const subscribeEmployeeWorkspace = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};
export const notifyEmployeeWorkspace = () => {
  try { window.dispatchEvent(new Event(EVENT)); } catch { /* ignore */ }
};
