// Platform-admin impersonation
// ----------------------------
// Lader en platform-admin "logge ind" på en specifik virksomheds panel ved at
// indløse en 5-cifret kode genereret server-side. Vi gemmer det valgte
// business-id i sessionStorage så det kun gælder den aktuelle browser-fane og
// forsvinder når fanen lukkes — virksomheden notificeres ikke om besøget.
const KEY = "sy.impersonate.business_id";

export const getImpersonatedBusinessId = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const setImpersonatedBusinessId = (id: string) => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
};

export const clearImpersonatedBusinessId = () => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

export const isImpersonating = () => !!getImpersonatedBusinessId();