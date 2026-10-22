import { useEffect, useRef, useState } from "react";
import { heroPhotos, HERO_PHOTO_SIZES, photoSrcSet } from "./hero-photos";

export default function HeroPhotoRotator() {
  const host = useRef<HTMLDivElement>(null);
  const baseImage = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [current, setCurrent] = useState(0);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let cancelled = false;
    let index = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let preloadTimer: ReturnType<typeof setTimeout> | undefined;
    let busy = false;
    let prepared: HTMLImageElement | undefined;
    let renderer: ReturnType<typeof import("./hero-photo-webgl").createPhotoTransition>;
    const active = () => visible && !document.hidden && !motion.matches;
    const prepare = () => {
      if (!active() || cancelled || prepared) return;
      prepared = new Image();
      prepared.fetchPriority = "low";
      prepared.decoding = "async";
      prepared.sizes = HERO_PHOTO_SIZES;
      prepared.srcset = photoSrcSet(heroPhotos[(index + 1) % heroPhotos.length]);
      prepared.src = heroPhotos[(index + 1) % heroPhotos.length].src;
      void prepared.decode().catch(() => { prepared = undefined; });
    };
    const advance = async () => {
      timer = undefined;
      if (cancelled || !active() || busy) return;
      busy = true;
      const next = (index + 1) % heroPhotos.length;
      const image = prepared ?? new Image();
      image.sizes = HERO_PHOTO_SIZES;
      image.srcset = photoSrcSet(heroPhotos[next]);
      image.src = heroPhotos[next].src;
      try {
        await image.decode();
        if (cancelled || !active()) return;
        const from = baseImage.current;
        const target = canvas.current;
        if (!from || !target) return;
        await from.decode();
        if (!renderer) {
          const { createPhotoTransition } = await import("./hero-photo-webgl");
          if (cancelled) return;
          renderer = createPhotoTransition(target);
        }
        if (renderer && !motion.matches) {
          await renderer.transition(from, image, () => { if (!cancelled) setRendering(true); });
        }
        if (cancelled) return;
        index = next;
        setCurrent(next);
        // Keep the completed canvas covering the DOM until the image paints.
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        await baseImage.current?.decode();
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        if (cancelled) return;
        setRendering(false);
      } catch {
        if (!cancelled) setRendering(false);
      }
      finally { busy = false; prepared = undefined; sync(); }
    };
    const sync = () => {
      clearTimeout(timer);
      clearTimeout(preloadTimer);
      timer = undefined;
      if (cancelled || !active() || busy) return;
      // Fetch only the next photo, after the first paint, never all five.
      preloadTimer = setTimeout(prepare, 3000);
      timer = setTimeout(advance, 16000);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      sync();
    });
    if (host.current) observer.observe(host.current);
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelled = true;
      observer.disconnect();
      clearTimeout(timer);
      clearTimeout(preloadTimer);
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      renderer?.dispose();
    };
  }, []);

  const photo = heroPhotos[current];
  return (
    <figure ref={host} style={{ aspectRatio: `${photo.width} / ${photo.height}` }} className="home-hero-photo relative w-full overflow-hidden rounded-lg bg-ocean">
      <img ref={baseImage} src={photo.src} srcSet={photoSrcSet(photo)} sizes={HERO_PHOTO_SIZES} alt={photo.alt} title={photo.title} width={photo.width} height={photo.height}
        fetchPriority={current === 0 ? "high" : "auto"} decoding="async" loading="eager"
        className="absolute inset-0 h-full w-full object-contain object-center" />
      <canvas ref={canvas} aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${rendering ? "visible" : "invisible"}`} />
    </figure>
  );
}
