/** Automatic preloading should not compete with intentional navigation on slow links. */
export function canPreloadPublicPages(connection?: { saveData?: boolean; effectiveType?: string }): boolean {
  return !connection?.saveData && !["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? "");
}