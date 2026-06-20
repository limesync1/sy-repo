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

/** easeOutExpo — flot "snerten-i-slut"-fornemmelse, lander blødt. */
const easeOutExpo = (t: number) =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

const AnimatedNumber = ({
  value,
  duration = 650,
  format = (n) => Math.round(n).toLocaleString("da-DK"),
  className,
}: Props) => {
  const [display, setDisplay] = useState(value);
  const [pulse, setPulse] = useState(false);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const pulseTimer = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    // Kort scale-pop så øjet fanger, at tallet har skiftet — uden ▲/▼.
    setPulse(true);
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setPulse(false), 280);

    const start = performance.now();
    const delta = value - from;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutExpo(t);
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
      if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    };
  }, [value, duration]);

  return (
    <span
      className={[
        "inline-block tabular-nums transition-transform duration-300 ease-out will-change-transform",
        pulse ? "scale-[1.06]" : "scale-100",
        className ?? "",
      ].join(" ")}
      aria-live="polite"
    >
      {format(display)}
    </span>
  );
};

export default AnimatedNumber;