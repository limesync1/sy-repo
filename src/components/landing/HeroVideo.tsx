import { useEffect, useRef, useState } from "react";
import poster from "@/assets/home-hero/vinduespolering-hero-poster.webp.asset.json";
import videoLarge from "@/assets/home-hero/vinduespolering-hero-960.mp4.asset.json";
import videoSmall from "@/assets/home-hero/vinduespolering-hero-640.mp4.asset.json";

type NetworkInfo = { saveData?: boolean; effectiveType?: string };

/**
 * Hero-video: stillbilledet males med det samme (preloadet i HTML), og videoen
 * hentes først når siden er færdig og browseren er ledig. Springes over ved
 * datasparetilstand, langsomt netværk og reduceret bevægelse; pauser uden for skærmen.
 */
export default function HeroVideo() {
  const host = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const net = (navigator as Navigator & { connection?: NetworkInfo }).connection;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (net?.saveData || /(^|-)2g$/.test(net?.effectiveType ?? "")) return;
    const pick = () => setSrc(window.matchMedia("(min-width: 1024px)").matches ? videoLarge.url : videoSmall.url);
    let idle: number | undefined;
    const start = () => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      idle = ric ? ric(pick, { timeout: 2500 }) : window.setTimeout(pick, 1200);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      if (idle !== undefined) {
        const cic = (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
        if (cic) cic(idle); else clearTimeout(idle);
      }
    };
  }, []);

  useEffect(() => {
    const el = video.current;
    if (!src || !el || !host.current) return;
    let visible = true;
    const sync = () => {
      if (visible && !document.hidden) void el.play().catch(() => {});
      else el.pause();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; sync(); });
    observer.observe(host.current);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, [src]);

  return (
    <figure ref={host} className="home-hero-photo relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-ocean">
      <img
        src={poster.url}
        alt="Vinduespudser fra Madsens Vinduespolering pudser et vindue på et parcelhus"
        width={960}
        height={720}
        fetchPriority="high"
        decoding="async"
        loading="eager"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {src && (
        <video
          ref={video}
          src={src}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => setPlaying(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${playing ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </figure>
  );
}
