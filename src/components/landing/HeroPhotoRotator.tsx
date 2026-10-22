import { useEffect, useRef, useState } from "react";
import windowBrush from "@/assets/home-hero/window-brush-enhanced.jpg";
import windowPolish from "@/assets/home-hero/window-polish-enhanced.jpg";
import roofCleaning from "@/assets/home-hero/roof-cleaning-enhanced.jpg";
import solarCleaning from "@/assets/home-hero/solar-cleaning-enhanced.jpg";
import paving from "@/assets/home-hero/paving-enhanced.jpg";

const photos = [windowBrush, windowPolish, roofCleaning, solarCleaning, paving];

/** Decode before a slow overblend; keep the outgoing photo fully opaque. */
export default function HeroPhotoRotator() {
  const host = useRef<HTMLDivElement>(null);
  const baseImage = useRef<HTMLImageElement>(null);
  const [current, setCurrent] = useState(0);
  const [incoming, setIncoming] = useState<number | null>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let cancelled = false;
    let index = 0;
    let timer: ReturnType<typeof setTimeout>;
    let finish: ReturnType<typeof setTimeout>;
    let firstFrame = 0;
    let secondFrame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
    });
    if (host.current) observer.observe(host.current);

    const advance = async () => {
      if (cancelled) return;
      if (!visible || document.hidden || motion.matches) {
        timer = setTimeout(advance, 1000);
        return;
      }
      const next = (index + 1) % photos.length;
      const image = new Image();
      image.src = photos[next];
      try {
        await image.decode();
        if (cancelled) return;
        setIncoming(next);
        firstFrame = requestAnimationFrame(() => {
          secondFrame = requestAnimationFrame(() => setFading(true));
        });
        finish = setTimeout(() => {
          if (cancelled) return;
          index = next;
          setCurrent(next);
          // Leave the fully opaque top layer in place until the new base
          // has decoded and painted; swapping src and removing it together
          // can otherwise expose a blank frame on slower devices.
          firstFrame = requestAnimationFrame(async () => {
            try {
              await baseImage.current?.decode();
            } catch {
              // Keep the already decoded top layer visible on failure.
              return;
            }
            if (cancelled) return;
            secondFrame = requestAnimationFrame(() => {
              if (cancelled) return;
              setIncoming(null);
              setFading(false);
              timer = setTimeout(advance, 11000);
            });
          });
        }, 6300);
      } catch {
        // A failed image must never replace the visible photograph.
        timer = setTimeout(advance, 12000);
      }
    };
    timer = setTimeout(advance, 11000);
    return () => {
      cancelled = true;
      observer.disconnect();
      clearTimeout(timer);
      clearTimeout(finish);
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, []);

  return (
    <div ref={host} aria-hidden className="home-hero-photo relative h-[24rem] overflow-hidden rounded-lg border border-ocean-foreground/25 xl:h-[26rem] 2xl:h-[30rem]">
      <img
        ref={baseImage}
        src={photos[current]}
        alt=""
        width={2400}
        height={1792}
        fetchPriority="high"
        decoding="async"
        loading="eager"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      {incoming !== null && (
        <img
          key={incoming}
          src={photos[incoming]}
          alt=""
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover object-center will-change-[opacity] transition-opacity duration-[6000ms] ease-in-out motion-reduce:transition-none ${fading ? "opacity-100" : "opacity-0"}`}
        />
      )}
      <div className="home-photo-shade pointer-events-none absolute inset-0" />
    </div>
  );
}