/** Hash links take priority over remembered topics; contact remains part of general. */
export function initialSettingsSection(hash: string, remembered: string | null): string {
  const requested = hash.startsWith("#settings-") ? hash.slice("#settings-".length) : remembered;
  return requested === "contact" || !requested ? "general" : requested;
}