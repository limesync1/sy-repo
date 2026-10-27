/** Hvilken installationsvej medarbejderen skal tilbydes på den aktuelle enhed. */
export type InstallPlatform = "android" | "ios" | "desktop";

export interface InstallEnv {
  userAgent: string;
  maxTouchPoints?: number;
  standalone?: boolean;
  native?: boolean;
}

export function detectInstallPlatform({ userAgent, maxTouchPoints = 0 }: InstallEnv): InstallPlatform {
  const ua = userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  // iPadOS udgiver sig for at være en Mac, men har touch.
  if (ua.includes("macintosh") && maxTouchPoints > 1) return "ios";
  return "desktop";
}

/** Appen er allerede installeret, når den kører som native app eller fra hjemmeskærmen. */
export function isAppInstalled(env: InstallEnv): boolean {
  return Boolean(env.native || env.standalone);
}

/** Rækkefølgen af knapper: den der passer til enheden kommer først. */
export function installOptionOrder(platform: InstallPlatform): Array<"android" | "ios"> {
  return platform === "ios" ? ["ios", "android"] : ["android", "ios"];
}
