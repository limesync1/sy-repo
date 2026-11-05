import noVideoIcon from "@/assets/content-icons/video-kommer-snart.svg.asset.json";
// "Kom godt i gang" — fast fane i virksomhedspanelet.
// Bygget som ét panelvindue (samme header/body/footer-flader som
// ruteplanlæggerens vinduer) og målt til præcis den synlige skærmhøjde, så
// guiden aldrig kræver at man ruller. Video-links styres af platform-admin
// (onboarding_videos), så videoerne kan skiftes uden kodeændring.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ExternalLink, Lock, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PanelIcon } from "@/components/shared/PanelIcon";
import { introVideoId, type OnboardingStepId } from "./steps";
import { useOnboardingSignals } from "@/hooks/useOnboardingSignals";
import { useOnboardingVideos, toEmbedUrl } from "@/hooks/useOnboardingVideos";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  business: any;
  onNavigate: (tab: string, action?: string | null) => void;
};

/** Måler den resterende synlige højde fra elementets top til skærmens bund
 *  (minus mobilens bundmenu), så layoutet altid passer præcist. */
function useFitToViewport<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + (window.scrollY || 0);
      const nav = document.querySelector<HTMLElement>(".service-panel-bottomnav");
      const navHeight = nav && getComputedStyle(nav).display !== "none" ? nav.getBoundingClientRect().height : 0;
      const gap = window.innerWidth < 640 ? 12 : 20;
      setHeight(Math.max(360, Math.floor(window.innerHeight - top - navHeight - gap)));
    };
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    const t = window.setTimeout(measure, 150);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      window.clearTimeout(t);
    };
  }, []);

  return { ref, height };
}

const StepVideo = ({ url, title }: { url?: string; title: string }) => {
  if (!url) {
    return (
      <div className="flex h-full min-h-[7rem] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-card text-muted-foreground">
        <img src={noVideoIcon.url} alt="" aria-hidden="true" className="h-12 w-12 object-contain" />
        <p className="text-sm font-medium">Video kommer snart</p>
      </div>
    );
  }
  const embed = toEmbedUrl(url);
  return (
    <div className="h-full min-h-[7rem] w-full overflow-hidden rounded-md border border-border bg-foreground">
      {embed ? (
        <iframe
          src={embed}
          title={`Guide: ${title}`}
          className="h-full w-full"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          loading="lazy"
        />
      ) : (
        <video key={url} src={url} controls preload="metadata" playsInline className="h-full w-full object-contain">
          Din browser kan ikke afspille videoen.
        </video>
      )}
    </div>
  );
};

export default function GettingStartedTab({ business, onNavigate }: Props) {
  const {
    counts, isLoading, done, steps, plan, skipped, toggleSkip,
    completedCount, totalCount, allDone, nextStepId,
  } = useOnboardingSignals(business);
  const { data: videos = {} } = useOnboardingVideos();
  const [selected, setSelected] = useState<OnboardingStepId | "intro" | null>(null);
  const { ref, height } = useFitToViewport<HTMLDivElement>();

  // Følg automatisk med til næste trin, når et trin bliver klaret.
  useEffect(() => { setSelected(null); }, [nextStepId]);

  const style = height ? { height } : undefined;

  if (isLoading || !counts) {
    return (
      <div ref={ref} style={style} className="planner-overlay flex h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm">
        <div className="planner-overlay-header flex items-center gap-3 border-b border-border px-4 py-3">
          <Skeleton className="h-12 w-12 rounded-md" />
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-64 max-w-full" /></div>
        </div>
        <div className="planner-overlay-body flex-1 space-y-3 bg-secondary/20 p-4">
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-full min-h-40 w-full rounded-md" />
        </div>
      </div>
    );
  }

  const introId = introVideoId(plan);
  const showIntro = selected === "intro" || (selected === null && completedCount === 0 && !skipped[introId]);
  const activeId = selected && selected !== "intro" ? selected : nextStepId ?? steps[0]?.id;
  const step = showIntro ? undefined : steps.find((s) => s.id === activeId) ?? steps[0];
  const publicUrl = `/v/${business?.slug ?? ""}`;
  const runStep = () => {
    if (!step) return;
    if (step.opensPublicProfile) {
      window.open(publicUrl, "_blank", "noopener,noreferrer");
      if (!done[step.id]) toggleSkip(step.id);
      return;
    }
    onNavigate(step.tab(counts), step.action?.(counts) ?? null);
  };
  const index = step ? steps.indexOf(step) : 0;
  const stepDone = step ? !!done[step.id] : false;
  const missing = step ? (step.requires ?? []).filter((r) => !r.met(counts)) : [];
  const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const showStep = !!step || showIntro;
  const guideTitle = plan === "listing" ? "Kom godt i gang · Kun profil" : "Kom godt i gang · Fuldt system";

  return (
    <div
      ref={ref}
      style={style}
      className="planner-overlay appointment-details-overlay flex h-[calc(100dvh-7rem)] min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm"
    >
      {/* Header — samme opbygning som panelvinduernes header */}
      <div className="planner-overlay-header shrink-0 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-start gap-3">
          <PanelIcon name="guide" className="h-12 w-12 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-tight text-foreground">{guideTitle}</h2>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">
              {allDone
                ? (plan === "listing" ? "Jeres profil er klar — kunder kan nu finde og kontakte jer." : "Opsætningen er færdig — I er klar til første rute.")
                : `${completedCount} af ${totalCount} trin klaret · Næste: ${steps.find((item) => item.id === nextStepId)?.title ?? "Fortsæt opsætningen"}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button asChild variant="outline" size="sm" aria-label="Se jeres side" className="h-11 min-w-11 text-sm">
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <span className="hidden sm:inline">Se jeres side</span>
                <ExternalLink className="h-3 w-3 sm:ml-1.5" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
          <div className="brand-blue-action h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Trinvælger */}
      {showStep && (
        <div className="shrink-0 border-b border-border bg-card px-3 py-2 sm:px-4" aria-label="Vælg trin">
          <div className="flex flex-nowrap gap-1.5 overflow-x-auto [scrollbar-width:none]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelected("intro")}
              aria-current={showIntro ? "step" : undefined}
              className={cn(
                "h-auto min-h-11 shrink-0 justify-start gap-2 rounded-md border px-2.5 py-1.5 text-left",
                showIntro ? "border-accent/40 bg-accent/10 text-foreground hover:bg-accent/15" : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <PlayCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="text-sm font-semibold">Intro</span>
            </Button>
            {steps.map((s, i) => {
              const isDone = !!done[s.id];
              const isActive = s.id === step?.id;
              return (
                <Button
                  key={s.id}
                  type="button"
                  variant="ghost"
                  onClick={() => setSelected(s.id)}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "h-auto min-h-11 w-44 shrink-0 justify-start gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors sm:w-48",
                    isActive
                      ? "border-accent/40 bg-accent/10 text-foreground hover:bg-accent/15 hover:text-foreground"
                      : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums",
                      isDone
                        ? "brand-blue-action border-transparent"
                        : isActive
                          ? "border-accent/50 bg-card text-accent"
                          : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {isDone ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block text-xs font-medium", isActive ? "text-accent" : "text-muted-foreground")}>Trin {i + 1}</span>
                    <span className="block whitespace-normal break-words text-sm font-semibold">{s.title}</span>
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Body */}
      <div className="planner-overlay-body min-h-0 flex-1 overflow-y-auto bg-secondary/20 p-3 sm:p-4">

        {showIntro && (
          <div className="grid min-h-0 grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)] lg:h-full lg:gap-4">
            <div className="aspect-video min-h-[7rem] lg:aspect-auto lg:min-h-0">
              <StepVideo url={videos[introId]} title="Introduktion" />
            </div>
            <div className="rounded-md border border-border bg-card p-3 sm:p-4">
              <h4 className="text-base font-semibold tracking-tight text-foreground">Velkommen til Serviceydere</h4>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {plan === "listing"
                  ? `På ${steps.length} korte trin gør vi jeres profil klar, så kunder kan finde jer og sende forespørgsler.`
                  : `På ${steps.length} korte trin går I fra tom konto til første rute. Trinene står i den rækkefølge, de skal laves.`}
              </p>
              <ol className="mt-3 space-y-1.5 text-sm text-foreground">
                {steps.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold tabular-nums">{done[s.id] ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}</span>
                    {s.title}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {showStep && step && (
          <div className="grid min-h-0 grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)] lg:h-full lg:grid-rows-1 lg:gap-4">
            <div className="aspect-video min-h-[7rem] lg:aspect-auto lg:min-h-0">
              <StepVideo url={videos[step.id]} title={step.title} />
            </div>
            <div className="flex min-h-0 min-w-0 flex-col rounded-md border border-border bg-card lg:max-h-none">
              <div className="flex min-h-9 shrink-0 items-center justify-between gap-2 border-b border-border bg-secondary/35 px-3 py-2">
                <h3 className="truncate text-[13px] font-semibold text-foreground">Trin {index + 1} af {totalCount}</h3>
                {stepDone && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Klaret
                  </span>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
                <h4 className="text-base font-semibold tracking-tight text-foreground">{step.title}</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                {step.tip && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Tip: {step.tip}</p>}
                {["public_profile", "employee_app", "upgrade"].includes(step.id) && (
                  <Button type="button" variant="outline" size="sm" className="mt-3 h-11" onClick={() => toggleSkip(step.id)}>
                    {skipped[step.id] ? "Markér som ikke klaret" : "Markér som klaret"}
                  </Button>
                )}
                {missing.length > 0 && (
                  <div className="mt-3 space-y-1 rounded-md border border-border bg-secondary/40 p-2.5">
                    {missing.map((r) => (
                      <Button variant="ghost" key={r.label} type="button" onClick={() => onNavigate(r.tab)} className="flex h-auto min-h-11 w-full justify-start gap-2 whitespace-normal text-left text-sm text-foreground hover:underline">
                        <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                        Kræver først: {r.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer — samme bundlinje som panelvinduerne */}
      {showIntro && (
        <div className="planner-overlay-footer flex shrink-0 items-center justify-end gap-2 border-t border-border bg-card px-4 py-2.5">
          <Button size="sm" className="brand-blue-action h-11 gap-1.5 text-sm" onClick={() => { if (!skipped[introId]) toggleSkip(introId as OnboardingStepId); setSelected(nextStepId ?? steps[0]?.id ?? null); }}>
            Start trin 1 <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {showStep && step && (
        <div className="planner-overlay-footer flex shrink-0 items-center justify-between gap-2 border-t border-border bg-card px-4 py-2.5">
          <Button
            variant="outline"
            size="sm"
            aria-label="Forrige trin" className="h-11 w-11 shrink-0 gap-1.5 sm:w-auto"
            onClick={() => setSelected(index > 0 ? steps[index - 1].id : "intro")}
          >
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Forrige</span>
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            {index < steps.length - 1 && (
              <Button variant="ghost" size="sm" className="hidden h-11 sm:inline-flex" onClick={() => setSelected(steps[index + 1].id)}>
                Se næste trin
              </Button>
            )}
            <Button
              size="sm"
              className={cn("h-auto min-h-11 min-w-0 gap-1.5 whitespace-normal text-sm", !stepDone && "brand-blue-action")}
              variant={stepDone ? "outline" : "default"}
              disabled={missing.length > 0}
              onClick={runStep}
            >
              {step.cta(counts)} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
