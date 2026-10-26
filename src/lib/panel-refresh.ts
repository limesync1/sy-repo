/** Query invalidation cannot refresh legacy screens that fetch into local state. */
const EVENT = "serviceydere:panel-refresh";
export function publishPanelRefresh(tables: readonly string[] | null) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: tables }));
}
export function subscribePanelRefresh(tables: readonly string[], refresh: () => void) {
  const listener = (event: Event) => {
    const changed = (event as CustomEvent<readonly string[] | null>).detail;
    if (changed === null || changed.some((table) => tables.includes(table))) refresh();
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}