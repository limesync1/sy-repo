import { useEffect, useRef, useState } from "react";
import { heroPhotos } from "./hero-photos";

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
    let timer: ReturnType<typeof setTimeout>;
    let renderer: ReturnType<typeof import("./hero-photo-webgl").createPhotoTransition>;
    const observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; });
    if (host.current) observer.observe(host.current);
    const advance = async () => {
      if (cancelled) return;
      if (!visible || document.hidden || motion.matches) {
        timer = setTimeout(advance, 1000);
        return;
      }
      const next = (index + 1) % heroPhotos.length;
      const image = new Image();
      image.src = heroPhotos[next].src;
      try {
        await image.decode();
        if (cancelled) return;
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
      if (!cancelled) timer = setTimeout(advance, 16000);
    };
    timer = setTimeout(advance, 16000);
    return () => {
      cancelled = true;
      observer.disconnect();
      clearTimeout(timer);
      renderer?.dispose();
    };
  }, []);

  const photo = heroPhotos[current];
  return (
    <div ref={host} className="home-hero-photo relative h-[24rem] overflow-hidden rounded-lg border border-ocean-foreground/25 xl:h-[26rem] 2xl:h-[30rem]">
      <img ref={baseImage} src={photo.src} alt={photo.alt} width={photo.width} height={photo.height}
        fetchPriority="high" decoding="async" loading="eager"
        className="absolute inset-0 h-full w-full object-cover object-center" />
      <canvas ref={canvas} aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${rendering ? "visible" : "invisible"}`} />
      <div className="home-photo-shade pointer-events-none absolute inset-0" />
    </div>
  );
}
