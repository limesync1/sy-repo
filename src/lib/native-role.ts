import { Capacitor } from "@capacitor/core";

export type NativeRole = "owner" | "employee" | "customer";
const KEY = "sy-native-role";

export const isNativeApp = () => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

export function readNativeRole(): NativeRole | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "owner" || v === "employee" || v === "customer" ? v : null;
  } catch { return null; }
}

export function saveNativeRole(role: NativeRole | null) {
  try {
    if (role) localStorage.setItem(KEY, role); else localStorage.removeItem(KEY);
  } catch { /* Blocked storage: the choice is simply asked again next time. */ }
}

/** Login page for a chosen role; Auth sends signed-in users to their own panel. */
const LOGIN_MODE: Record<NativeRole, string> = { owner: "business", employee: "employee", customer: "customer" };
export const loginPathFor = (role: NativeRole) => `/log-ind?mode=${LOGIN_MODE[role]}&app=1`;
