import { useEffect, useState } from "react";

/**
 * Følger om skærmen/fanen reelt er synlig.
 *
 * Bruges til to ting i kørselsguiden:
 *  1) Strøm og varme: GPS-watch, positions-interpolation og kort-kamera
 *     sættes på pause når skærmen slukkes eller appen ryger i baggrunden.
 *  2) Stabil genoptagelse: `resumeToken` skifter hver gang skærmen kommer
 *     tilbage, så guiden kan nulstille gamle talebeskeder og hente frisk
 *     position i stedet for at afspille instruktioner fra før pausen.
 */
export const usePageVisible = () => {
  const [visible, setVisible] = useState<boolean>(
    typeof document === "undefined" ? true : document.visibilityState !== "hidden",
  );
  const [resumeToken, setResumeToken] = useState(0);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onChange = () => {
      const isVisible = document.visibilityState !== "hidden";
      setVisible(isVisible);
      if (isVisible) setResumeToken((n) => n + 1);
    };
    const onHide = () => setVisible(false);
    document.addEventListener("visibilitychange", onChange);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onChange);
    return () => {
      document.removeEventListener("visibilitychange", onChange);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onChange);
    };
  }, []);

  return { visible, resumeToken };
};
