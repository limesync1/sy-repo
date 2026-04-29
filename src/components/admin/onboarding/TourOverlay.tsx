import { useEffect, useState, useLayoutEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft, ArrowRight } from "lucide-react";
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
const POLL_TIMEOUT_MS = 6000;
/** Hvis et trin ikke kan findes inden for timeout, skip det stille til næste. */
const AUTO_SKIP_ON_MISSING = true;

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
    let mo: MutationObserver | null = null;
    let pollTimer: number | null = null;

    const measure = (el: Element) => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    const attach = (el: Element) => {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      requestAnimationFrame(() => requestAnimationFrame(() => measure(el)));
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
    };

    let detach: (() => void) | undefined;

    const tryFind = () => {
      if (cancelled) return;
      const el = document.querySelector(step.selector);
      if (el) {
        detach = attach(el);
        return;
      }
      elapsed += POLL_MS;
      if (elapsed >= POLL_TIMEOUT_MS) {
        setMissing(true);
        if (AUTO_SKIP_ON_MISSING) {
          // Hop stille videre — bedre end at vise en fejl
          setTimeout(() => { if (!cancelled) next(); }, 50);
        }
        return;
      }
      pollTimer = window.setTimeout(tryFind, POLL_MS);
    };

    // Lyt også efter DOM-ændringer så vi finder elementet så snart det dukker op
    mo = new MutationObserver(() => {
      if (cancelled || detach) return;
      const el = document.querySelector(step.selector);
      if (el) {
        detach = attach(el);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    tryFind();
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      if (mo) mo.disconnect();
      if (detach) detach();
    };
  }, [step, location.pathname, location.search, next]);

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
  // VIGTIGT: tooltippen må aldrig dække spotlight-feltet — derfor vælger vi
  // automatisk den side hvor tooltippen kan være FULDT UDENFOR rect'en, og
  // hvis ingen side har plads til den fulde højde/bredde, falder vi tilbage
  // til den side med mest plads og clamper inden for viewportens kant —
  // men aldrig så den overlapper rect'en.
  const isLast = stepIndex + 1 >= active.steps.length;
  const tooltipStyle: React.CSSProperties = (() => {
    if (!rect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    const margin = 14;
    const tooltipW = 320;
    const tooltipH = 240; // konservativt skøn — vi clamper alligevel
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    const spaceBelow = vh - (rect.top + rect.height) - margin * 2;
    const spaceAbove = rect.top - margin * 2;
    const spaceRight = vw - (rect.left + rect.width) - margin * 2;
    const spaceLeft  = rect.left - margin * 2;

    // Hvilke sider har plads til den fulde tooltip?
    const fits = {
      bottom: spaceBelow >= tooltipH,
      top:    spaceAbove >= tooltipH,
      right:  spaceRight >= tooltipW,
      left:   spaceLeft  >= tooltipW,
    } as const;

    // Vælg side: respekter step.placement hvis den passer, ellers auto.
    const requested = step.placement || "auto";
    const order: Array<"bottom"|"top"|"right"|"left"> =
      requested === "auto"
        ? (["bottom","top","right","left"] as const)
            .slice() // kopiér
            .sort((a, b) => {
              const sa = a === "bottom" ? spaceBelow : a === "top" ? spaceAbove : a === "right" ? spaceRight : spaceLeft;
              const sb = b === "bottom" ? spaceBelow : b === "top" ? spaceAbove : b === "right" ? spaceRight : spaceLeft;
              return sb - sa;
            })
        : [requested as any, "bottom", "top", "right", "left"].filter((v, i, a) => a.indexOf(v) === i) as any;

    const p = order.find((s) => fits[s]) || order[0];

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

    // Clamp inden for viewport
    top = Math.max(12, Math.min(vh - tooltipH - 12, top));
    left = Math.max(12, Math.min(vw - tooltipW - 12, left));

    // Sidste sikkerhed: hvis tooltippen ALLIGEVEL overlapper spotlight-rect'en
    // (fordi viewport er trang), så skub den væk fra rect'en til den side
    // med mest plads — så vi aldrig dækker det felt brugeren skal udfylde.
    const overlaps =
      left < rect.left + rect.width + 4 &&
      left + tooltipW > rect.left - 4 &&
      top < rect.top + rect.height + 4 &&
      top + tooltipH > rect.top - 4;
    if (overlaps) {
      const candidates = [
        { side: "bottom", val: spaceBelow, top: rect.top + rect.height + margin, left },
        { side: "top",    val: spaceAbove, top: rect.top - tooltipH - margin,    left },
        { side: "right",  val: spaceRight, top, left: rect.left + rect.width + margin },
        { side: "left",   val: spaceLeft,  top, left: rect.left - tooltipW - margin },
      ].sort((a, b) => b.val - a.val);
      const best = candidates[0];
      top = Math.max(12, Math.min(vh - 12 - 80, best.top));
      left = Math.max(12, Math.min(vw - tooltipW - 12, best.left));
    }

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
        className="absolute pointer-events-auto rounded-2xl border border-border bg-card shadow-2xl ring-1 ring-black/5 overflow-hidden animate-fade-in-soft"
        style={tooltipStyle}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 items-center rounded-full bg-accent/10 px-2 text-[10px] font-semibold uppercase tracking-wide text-accent">
                Guide
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                Trin {stepIndex + 1} af {active.steps.length}
              </span>
            </div>
            <h3 className="mt-1.5 text-[15px] font-semibold leading-tight text-foreground">
              {step.title}
            </h3>
          </div>
          <button
            onClick={stop}
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Luk guide"
            title="Luk guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <p className="px-5 pt-2 pb-4 text-[13px] leading-relaxed text-muted-foreground">
          {step.body}
        </p>

        {/* Step-progress dots */}
        <div className="px-5 pb-3 flex items-center gap-1">
          {active.steps.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < stepIndex
                  ? "bg-accent/70"
                  : i === stepIndex
                    ? "bg-accent"
                    : "bg-border"
              }`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border bg-secondary/40 px-3 py-2.5">
          <Button
            variant="ghost" size="sm"
            onClick={prev}
            disabled={stepIndex === 0}
            className="gap-1 h-8 px-2 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Tilbage
          </Button>
          <div className="flex items-center gap-1">
            {step.skippable && !isLast && (
              <Button
                variant="ghost" size="sm"
                onClick={next}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Spring dette trin over"
              >
                Spring over
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="h-8 gap-1 px-3 text-xs">
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