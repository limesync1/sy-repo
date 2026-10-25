/** Consume a one-shot navigation hint without making loading depend on storage access. */
export function consumePanelNavigation(): boolean {
  try {
    const internal = sessionStorage.getItem("sy.panel.navigation") === "1";
    if (internal) sessionStorage.removeItem("sy.panel.navigation");
    return internal;
  } catch {
    return false;
  }
}