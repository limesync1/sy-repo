// PageTransition — fælles fade+lille translate-in når brugeren skifter side/tab
// i admin-, virksomheds- og medarbejderpanelet. Holdes bevidst kort (220ms)
// og uden scale, så det føles roligt og ikke distraherer fra indholdet.
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const PageTransition = ({
  /** Skift denne nøgle for at trigge en ny fade-in (fx fane-navn eller route). */
  transitionKey,
  className,
  children,
}: {
  transitionKey: string | number;
  className?: string;
  children: ReactNode;
}) => {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setShown(false);
    // Næste frame så transitionen rent faktisk kan animere fra "skjult" til "vist".
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [transitionKey]);

  return (
    <div
      className={cn(
        "transition-[opacity,transform] duration-200 ease-out will-change-[opacity,transform]",
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
        className,
      )}
    >
      {children}
    </div>
  );
};

export default PageTransition;