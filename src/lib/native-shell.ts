import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App } from "@capacitor/app";

/** Native-only polish: hide splash once rendered, light status bar, Android back button, offline notice. */
export async function initNativeShell() {
  StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  StatusBar.setBackgroundColor({ color: "#ffffff" }).catch(() => {});

  // Hide the splash once React has painted (two frames), with a safety timeout.
  const hide = () => SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
  requestAnimationFrame(() => requestAnimationFrame(hide));
  setTimeout(hide, 4000);

  App.addListener("backButton", ({ canGoBack }) => {
    const action = backButtonAction({
      dialogOpen: !!document.querySelector('[role="dialog"][data-state="open"]'),
      pathname: window.location.pathname,
      canGoBack,
    });
    if (action === "close-dialog") document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    else if (action === "exit") App.exitApp();
    else window.history.back();
  }).catch(() => {});

  const banner = document.createElement("div");
  banner.setAttribute("role", "alert");
  banner.className = "native-offline-banner";
  banner.innerHTML = '<span>Ingen internetforbindelse</span><button type="button">Prøv igen</button>';
  banner.querySelector("button")?.addEventListener("click", () => window.location.reload());
  const sync = () => {
    if (navigator.onLine) banner.remove();
    else if (!banner.isConnected) document.body.appendChild(banner);
  };
  window.addEventListener("online", sync);
  window.addEventListener("offline", sync);
  sync();
}
