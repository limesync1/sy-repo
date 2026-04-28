import { useEffect, useState, useLayoutEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft, ArrowRight, SkipForward } from "lucide-react";
import { useTour } from "./TourContext";
import { useCompleteOnboardingStep } from "@/hooks/useOnboarding";
import { toast } from "sonner";

/**
 * TourOverlay — renderer:
 *   • et SVG-mask-overlay der dimmer hele skærmen og laver et "hul" rundt om
 *     mål-elementet (med blød afrundet kant + tynd accent-glow),
 *   • en flydende tooltip med titel, tekst og næste/forrige/spring-over,
 *   • automatisk scroll så mål-elementet er synligt.
 *
 * Hvis mål-elementet ikke findes endnu (fordi siden navigerer eller loader),
 * poller overlayet i 5 sekunder før det skipper til næste step.
 */

type Rect = { top: number; left: number; width: number; height: number };

const PADDING = 8;
const POLL_MS = 100;
const POLL_TIMEOUT_MS = 5000;

export const TourOverlay = ({ businessId }: { businessId?: string }) => {
  const { active, stepIndex, next, prev, stop } = useTour();
  const navigate = useNavigate();
  const location = useLocation();
  const completeStep = useCompleteOnboardingStep(businessId);
  const [rect, setRect] = useState<Rect | null>(null);
  const [missing, setMissing] = useState(false);
  const lastNavigatedToRef = useRef<string | null>(null);
  const lastBlockToastRef = useRef<number>(0);

  const step = active?.steps[stepIndex];

  // Naviger først hvis steppet kræver det — undgå loop ved at huske sidste destination.
  useEffect(() => {
    if (!step?.navigateTo) return;
    if (lastNavigatedToRef.current === `${stepIndex}:${step.navigateTo}`) return;
    const currentFull = location.pathname + location.search;
    if (currentFull !== step.navigateTo) {
      navigate(step.navigateTo);
    }
    lastNavigatedToRef.current = `${stepIndex}:${step.navigateTo}`;
  }, [step, stepIndex, navigate, location]);

  // Find mål-elementet og opdater rect ved scroll/resize.
  useLayoutEffect(() => {
    if (!step) { setRect(null); return; }
    setMissing(false);
    let cancelled = false;
    let elapsed = 0;

    const measure = (el: Element) => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    const tryFind = () => {
      if (cancelled) return;
      const el = document.querySelector(step.selector);
      if (el) {
        // Scroll i syne hvis nødvendigt
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        // Vent et par frames på at scroll'en sætter sig
        requestAnimationFrame(() => requestAnimationFrame(() => measure(el)));
        // Lyt fortsat efter ændringer
        const onUpdate = () => measure(el);
        window.addEventListener("scroll", onUpdate, true);
        window.addEventListener("resize", onUpdate);
        const ro = new ResizeObserver(onUpdate);
        ro.observe(el);
        return () => {
          window.removeEventListener("scroll", onUpdate, true);
          window.removeEventListener("resize", onUpdate);
          ro.disconnect();
        };
      }
      elapsed += POLL_MS;
      if (elapsed >= POLL_TIMEOUT_MS) {
        setMissing(true);
        return;
      }
      const t = setTimeout(tryFind, POLL_MS);
      return () => clearTimeout(t);
    };

    let cleanup = tryFind();
    return () => {
      cancelled = true;
      if (typeof cleanup === "function") cleanup();
    };
  }, [step, location.pathname, location.search]);

  if (!active || !step) return null;

  const handleFinish = () => {
    if (active.completesStepId && businessId) {
      completeStep.mutate(active.completesStepId);
    }
    stop();
  };

  const handleNext = () => {
    if (stepIndex + 1 >= active.steps.length) {
      handleFinish();
    } else {
      next();
    }
  };

  /**
   * Vis en toast når brugeren forsøger at klikke uden for spotlight'et —
   * men throttle så vi ikke spammer ved hvert lille klik.
   */
  const showBlockedToast = () => {
    const now = Date.now();
    if (now - lastBlockToastRef.current < 1500) return;
    lastBlockToastRef.current = now;
    toast.info("Ikke muligt under guide", {
      description: "Brug knapperne i guiden for at gå videre — eller luk guiden hvis du vil bruge siden frit.",
    });
  };

  // Beregn tooltip-position. Hvis ingen rect (mangler element) → vis centreret.
  const isLast = stepIndex + 1 >= active.steps.length;
  const tooltipStyle: React.CSSProperties = (() => {
    if (!rect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    const placement = step.placement || "auto";
    const margin = 16;
    const tooltipW = 340;
    const tooltipH = 180;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // Auto: vælg den side med mest plads
    let p = placement;
    if (p === "auto") {
      const spaceBelow = vh - (rect.top + rect.height);
      const spaceAbove = rect.top;
      const spaceRight = vw - (rect.left + rect.width);
      const spaceLeft = rect.left;
      const max = Math.max(spaceBelow, spaceAbove, spaceRight, spaceLeft);
      p = max === spaceBelow ? "bottom"
        : max === spaceAbove ? "top"
        : max === spaceRight ? "right" : "left";
    }

    let top = 0, left = 0;
    switch (p) {
      case "bottom":
        top = rect.top + rect.height + margin;
        left = rect.left + rect.width / 2 - tooltipW / 2;
        break;
      case "top":
        top = rect.top - tooltipH - margin;
        left = rect.left + rect.width / 2 - tooltipW / 2;
        break;
      case "right":
        top = rect.top + rect.height / 2 - tooltipH / 2;
        left = rect.left + rect.width + margin;
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipH / 2;
        left = rect.left - tooltipW - margin;
        break;
    }
    // Hold inden for viewport
    top = Math.max(12, Math.min(vh - tooltipH - 12, top));
    left = Math.max(12, Math.min(vw - tooltipW - 12, left));
    return { top, left, width: tooltipW };
  })();

  // SVG mask: rektangel over hele skærmen minus mål-elementet
  const maskRect = rect
    ? {
        x: rect.left - PADDING,
        y: rect.top - PADDING,
        w: rect.width + PADDING * 2,
        h: rect.height + PADDING * 2,
      }
    : null;

  const interactive = !!step.interactive;

  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none" aria-live="polite">
      {/*
        Dim-overlay med spotlight-hul.
        Når step.interactive er TRUE skal klik på mål-elementet gå igennem,
        mens klik UDENFOR stadig blokeres — derfor bruger vi 4 div'er rundt
        om spotlight-hullet (top/bottom/left/right) i stedet for et SVG over
        hele skærmen. SVG'en bruges kun til den visuelle dim+ring.
      */}
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        style={{ touchAction: "none" }}
        aria-hidden="true"
      >
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {maskRect && (
              <rect
                x={maskRect.x} y={maskRect.y}
                width={maskRect.w} height={maskRect.h}
                rx={10} ry={10}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%" height="100%"
          fill="hsl(var(--foreground))" fillOpacity="0.55"
          mask="url(#tour-mask)"
        />
        {/* Accent-ring rundt om mål-elementet */}
        {maskRect && (
          <rect
            x={maskRect.x} y={maskRect.y}
            width={maskRect.w} height={maskRect.h}
            rx={10} ry={10}
            fill="none"
            stroke="hsl(var(--accent))"
            strokeWidth="2"
            className="animate-pulse"
          />
        )}
      </svg>

      {/*
        Klik-blokerings-laget. Vi tegner 4 transparente rektangler omkring
        spotlight-hullet. Klik på dem viser en toast. Området INDEN i hullet
        forbliver klikbart — men kun når step.interactive er true (ellers
        lægger vi også et blokerings-rect oven på spotlight'et).
      */}
      {maskRect ? (
        <>
          {/* Top */}
          <div
            className="absolute pointer-events-auto"
            style={{ top: 0, left: 0, right: 0, height: Math.max(0, maskRect.y) }}
            onClick={showBlockedToast}
          />
          {/* Bottom */}
          <div
            className="absolute pointer-events-auto"
            style={{ top: maskRect.y + maskRect.h, left: 0, right: 0, bottom: 0 }}
            onClick={showBlockedToast}
          />
          {/* Left */}
          <div
            className="absolute pointer-events-auto"
            style={{ top: maskRect.y, left: 0, width: Math.max(0, maskRect.x), height: maskRect.h }}
            onClick={showBlockedToast}
          />
          {/* Right */}
          <div
            className="absolute pointer-events-auto"
            style={{ top: maskRect.y, left: maskRect.x + maskRect.w, right: 0, height: maskRect.h }}
            onClick={showBlockedToast}
          />
          {/* Spotlight-området: hvis IKKE interactive, blokér også her. */}
          {!interactive && (
            <div
              className="absolute pointer-events-auto"
              style={{
                top: maskRect.y, left: maskRect.x,
                width: maskRect.w, height: maskRect.h,
              }}
              onClick={showBlockedToast}
            />
          )}
        </>
      ) : (
        // Intet mål endnu → blokér hele skærmen
        <div
          className="absolute inset-0 pointer-events-auto"
          onClick={showBlockedToast}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute pointer-events-auto rounded-xl border border-border bg-card shadow-2xl"
        style={tooltipStyle}
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Trin {stepIndex + 1} af {active.steps.length}
            </p>
            <h3 className="mt-0.5 text-sm font-semibold text-foreground">{step.title}</h3>
          </div>
          <button
            onClick={stop}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Luk guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="px-4 pt-2 text-sm text-muted-foreground">
          {step.body}
          {missing && (
            <span className="mt-2 block text-xs text-destructive">
              Kunne ikke finde elementet — du kan stadig fortsætte.
            </span>
          )}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border bg-secondary/40 px-4 py-2.5 rounded-b-xl">
          <Button
            variant="ghost" size="sm"
            onClick={prev}
            disabled={stepIndex === 0}
            className="gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Forrige
          </Button>
          <div className="flex items-center gap-1.5">
            {step.skippable && !isLast && (
              <Button
                variant="ghost" size="sm"
                onClick={next}
                className="gap-1 text-muted-foreground hover:text-foreground"
              >
                <SkipForward className="h-3.5 w-3.5" /> Spring over
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="gap-1">
              {isLast ? "Færdig" : <>Næste <ArrowRight className="h-3.5 w-3.5" /></>}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default TourOverlay;