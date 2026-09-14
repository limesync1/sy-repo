import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";

interface HorizontalScrollerProps {
  children: ReactNode;
  className?: string;
  /** Tilgængelig label til scroll-regionen — læses op af skærmlæsere. */
  ariaLabel?: string;
}

const HorizontalScroller = ({ children, className = "", ariaLabel = "Vandret liste — brug piletaster eller swipe" }: HorizontalScrollerProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scroll = (dir: "left" | "right") => {
    const el = ref.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className={`group/scroll relative ${className}`}>
      {/* Left arrow */}
      {canLeft && (
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll venstre"
          className="absolute -left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-all hover:scale-105 md:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canRight && (
        <button
          onClick={() => scroll("right")}
          aria-label="Scroll højre"
          className="absolute -right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-all hover:scale-105 md:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div
        ref={ref}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        /* Bløde kanter i stedet for kort der bliver klippet skarpt over. */
        style={{
          maskImage: `linear-gradient(90deg, transparent 0, #000 ${canLeft ? "56px" : "0px"}, #000 calc(100% - ${canRight ? "56px" : "0px"}), transparent 100%)`,
          WebkitMaskImage: `linear-gradient(90deg, transparent 0, #000 ${canLeft ? "56px" : "0px"}, #000 calc(100% - ${canRight ? "56px" : "0px"}), transparent 100%)`,
        }}
        className="scrollbar-none flex gap-4 overflow-x-auto scroll-smooth pb-2 outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-[28px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >

        {children}
      </div>
    </div>
  );
};

export default HorizontalScroller;
