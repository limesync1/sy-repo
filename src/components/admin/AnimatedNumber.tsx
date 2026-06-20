import { useEffect, useRef, useState } from "react";

/**
 * AnimatedNumber — tweener tallet smooth fra forrige værdi til ny værdi.
 * Tilføjer også en kort flash + retnings-indikator (▲/▼) når værdien ændres,
 * så brugeren tydeligt mærker at deres valg har ændret prisen.
 */
type Props = {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const AnimatedNumber = ({
  value,
  duration = 450,
  format = (n) => Math.round(n).toLocaleString("da-DK"),
  className,
}: Props) => {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const start = performance.now();
    const delta = value - from;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(t);
      setDisplay(from + delta * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return (
    <span className={`tabular-nums ${className ?? ""}`} aria-live="polite">
      {format(display)}
    </span>
  );
};

export default AnimatedNumber;