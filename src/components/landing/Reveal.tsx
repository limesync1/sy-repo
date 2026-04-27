import { useEffect, useRef, useState, type ReactNode, type ElementType, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Reveal — fader sit children blødt ind når elementet kommer i viewport.
 *
 * Bruger IntersectionObserver (cross-browser, billigt) og falder tilbage til
 * "altid synlig" hvis browseren ikke understøtter det (gamle Safari/Edge) —
 * så indhold aldrig bliver usynligt for nogen.
 *
 * Respekterer automatisk `prefers-reduced-motion` via .reveal CSS-reglen i
 * index.css, så vi ikke behøver duplikere logikken her.
 *
 * Bruges typisk omkring landings-sektioner:
 *   <Reveal as="section">…</Reveal>
 *   <Reveal delay={120}>…</Reveal>
 */
type RevealProps = {
  children: ReactNode;
  /** HTML-tag der renderes — "div" som default. */
  as?: ElementType;
  /** Forsinkelse i ms før animationen starter når elementet bliver synligt. */
  delay?: number;
  /** Ekstra class names (lægges efter .reveal). */
  className?: string;
  /** Hvor meget af elementet skal være synligt før det aktiveres (0–1). */
  threshold?: number;
  /** Margin omkring viewport-roden — "0px 0px -10% 0px" gør at sektionen
   *  først aktiveres når den er pænt inde i viewport (føles mere naturligt). */
  rootMargin?: string;
};

const Reveal = ({
  children,
  as: Tag = "div",
  delay = 0,
  className,
  threshold = 0.12,
  rootMargin = "0px 0px -8% 0px",
}: RevealProps) => {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // SSR/legacy fallback — vis straks i stedet for at risikere skjult indhold.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect(); // kør kun én gang — ingen flicker ved scroll-tilbage
            break;
          }
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);

  const style: CSSProperties = delay ? { transitionDelay: `${delay}ms` } : {};

  return (
    <Tag
      ref={ref as never}
      style={style}
      className={cn("reveal", visible && "is-visible", className)}
    >
      {children}
    </Tag>
  );
};

export default Reveal;