import { Capacitor } from "@capacitor/core";

export type NativeRole = "owner" | "employee";
const KEY = "sy-native-role";

export const isNativeApp = () => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

export function readNativeRole(): NativeRole | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "owner" || v === "employee" ? v : null;
  } catch { return null; }
}

export function saveNativeRole(role: NativeRole | null) {
  try {
    if (role) localStorage.setItem(KEY, role); else localStorage.removeItem(KEY);
  } catch { /* Blocked storage: the choice is simply asked again next time. */ }
}

/** Login page for a chosen role; Auth sends signed-in users to their own panel. */
export const loginPathFor = (role: NativeRole) =>
  role === "owner" ? "/log-ind?mode=business&app=1" : "/log-ind?mode=employee&app=1";
