import { useEffect, useRef, useState } from "react";

/**
 * AnimatedNumber — fysik-baseret spring-animation af tal.
 *
 * Vi simulerer en dæmpet fjeder (spring) i stedet for en lineær tween,
 * så tallet får et lille naturligt overshoot og lander blødt — præcis som
 * Apples HUD-tællere og Stripes pris-felter.
 *
 * Stigninger og fald får forskellig "feel":
 *   - OP (prisen stiger): stiv fjeder, mere fart, lille overshoot — føles
 *     hurtigt og bekræftende: "ja, vi tilføjede noget".
 *   - NED (prisen falder): blødere fjeder, lidt langsommere — føles
 *     beroligende: "godt, du sparede penge".
 *
 * Spring-koefficienter justeret manuelt for at ramme 60 fps og ~600-900 ms
 * settle-tid uden at føles træg.
 */
type Props = {
  value: number;
  format?: (n: number) => string;
  className?: string;
};

type SpringConfig = { stiffness: number; damping: number; mass: number };

const SPRING_UP: SpringConfig   = { stiffness: 260, damping: 17, mass: 1 }; // bouncy, hurtigt
const SPRING_DOWN: SpringConfig = { stiffness: 140, damping: 20, mass: 1 }; // rolig, ingen bounce

const AnimatedNumber = ({
  value,
  format = (n) => Math.round(n).toLocaleString("da-DK"),
  className,
}: Props) => {
  const [display, setDisplay] = useState(value);
  const [pulse, setPulse] = useState<"up" | "down" | null>(null);

  // Fjeder-state holdes i refs så vi ikke trigger re-renders pr. frame.
  const posRef = useRef(value);     // nuværende værdi (interpoleret)
  const velRef = useRef(0);         // hastighed
  const targetRef = useRef(value);  // mål
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const pulseTimer = useRef<number | null>(null);

  useEffect(() => {
    if (targetRef.current === value) return;
    const goingUp = value > targetRef.current;
    targetRef.current = value;

    // Diskret scale-pop — kortere og mindre ved fald.
    setPulse(goingUp ? "up" : "down");
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(
      () => setPulse(null),
      goingUp ? 260 : 360,
    );

    if (rafRef.current != null) return; // loop kører allerede

    lastTimeRef.current = null;
    const step = (now: number) => {
      const last = lastTimeRef.current ?? now;
      // Klem dt så et tab-skift ikke smider fjederen ud i rummet.
      const dt = Math.min(0.064, (now - last) / 1000);
      lastTimeRef.current = now;

      const cfg = targetRef.current > posRef.current ? SPRING_UP : SPRING_DOWN;
      const x = posRef.current;
      const v = velRef.current;
      const target = targetRef.current;

      // F = -k(x - target) - c*v   →   a = F / m
      const force = -cfg.stiffness * (x - target) - cfg.damping * v;
      const accel = force / cfg.mass;

      const newV = v + accel * dt;
      const newX = x + newV * dt;

      posRef.current = newX;
      velRef.current = newV;
      setDisplay(newX);

      // Sluk når både position og hastighed er essentielt 0.
      const settled =
        Math.abs(newV) < 0.05 && Math.abs(newX - target) < 0.5;
      if (settled) {
        posRef.current = target;
        velRef.current = 0;
        setDisplay(target);
        rafRef.current = null;
      } else {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      // Bemærk: vi rydder kun timer, ikke RAF — vi vil lade fjederen lande
      // selv hvis brugeren klikker hurtigt flere gange i træk.
      if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    };
  }, [value]);

  return (
    <span
      className={[
        "inline-block tabular-nums will-change-transform transition-transform",
        pulse === "up"
          ? "scale-[1.07] duration-150 ease-out"
          : pulse === "down"
          ? "scale-[0.97] duration-300 ease-out"
          : "scale-100 duration-300 ease-out",
        className ?? "",
      ].join(" ")}
      aria-live="polite"
    >
      {format(display)}
    </span>
  );
};

export default AnimatedNumber;