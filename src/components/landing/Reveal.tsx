import { useEffect, useRef, useState, memo, type ReactNode, type ElementType, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Delt IntersectionObserver — i stedet for at oprette én observer pr. <Reveal>
 * (som koster main-thread arbejde + GC pres på low-end Android), genbruger vi
 * én enkelt observer for alle reveal-elementer. Det reducerer overhead markant
 * når forsiden har mange sektioner.
 */
type RevealCallback = () => void;
const callbacks = new WeakMap<Element, RevealCallback>();
let sharedObserver: IntersectionObserver | null = null;

const getObserver = () => {
  if (sharedObserver || typeof IntersectionObserver === "undefined") return sharedObserver;
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const cb = callbacks.get(entry.target);
          if (cb) {
            cb();
            sharedObserver?.unobserve(entry.target);
            callbacks.delete(entry.target);
          }
        }
      }
    },
    { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
  );
  return sharedObserver;
};

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

const Reveal = memo(({
  children,
  as: Tag = "div",
  delay = 0,
  className,
}: RevealProps) => {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = getObserver();
    if (!io) {
      setVisible(true);
      return;
    }
    callbacks.set(el, () => setVisible(true));
    io.observe(el);
    return () => {
      io.unobserve(el);
      callbacks.delete(el);
    };
  }, []);

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
});
Reveal.displayName = "Reveal";

export default Reveal;