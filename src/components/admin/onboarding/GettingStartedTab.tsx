// "Kom godt i gang" — fast fane i virksomhedspanelet.
// Én topbar med fremskridt ("2 af 5 trin klaret") og ét trin ad gangen med
// sin egen guide-video. Video-links styres af platform-admin
// (onboarding_videos), så videoerne kan skiftes uden kodeændring.
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ExternalLink, Lock, PlayCircle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageHeader, SectionCard } from "@/components/admin/shared/AdminUI";
import { FOCUS_OPTIONS, type OnboardingStepId } from "./steps";
import { useOnboardingSignals } from "@/hooks/useOnboardingSignals";
import { useOnboardingVideos, toEmbedUrl } from "@/hooks/useOnboardingVideos";
import { ListCardSkeleton, PageHeaderSkeleton } from "@/components/admin/shared/Skeletons";

type Props = {
  business: any;
  onNavigate: (tab: string, action?: string | null) => void;
};

const StepVideo = ({ url, title }: { url?: string; title: string }) => {
  if (!url) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 text-muted-foreground">
        <PlayCircle className="h-10 w-10 opacity-50" aria-hidden="true" />
        <p className="text-sm font-medium">Video kommer snart</p>
      </div>
    );
  }
  const embed = toEmbedUrl(url);
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-foreground">
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
    counts, isLoading, done, steps, focus, setFocus, clearFocus,
    completedCount, totalCount, allDone, nextStepId,
  } = useOnboardingSignals(business);
  const { data: videos = {} } = useOnboardingVideos();
  const [selected, setSelected] = useState<OnboardingStepId | null>(null);

  // Følg automatisk med til næste trin, når et trin bliver klaret.
  useEffect(() => { setSelected(null); }, [nextStepId]);

  if (isLoading || !counts) {
    return (
      <div className="space-y-4">
        <PageHeaderSkeleton withAction={false} />
        <ListCardSkeleton rows={3} />
      </div>
    );
  }

  const activeId = selected ?? nextStepId ?? steps[0]?.id;
  const step = steps.find((s) => s.id === activeId) ?? steps[0];
  const index = step ? steps.indexOf(step) : 0;
  const stepDone = step ? !!done[step.id] : false;
  const missing = step ? (step.requires ?? []).filter((r) => !r.met(counts)) : [];
  const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kom godt i gang"
        description={allDone ? "Opsætningen er færdig — jeres side er klar til kunder." : "Se videoen for hvert trin, og gør det bagefter i panelet."}
        action={
          <Button asChild variant="outline" size="sm" className="h-9 text-xs">
            <a href={`/v/${business?.slug ?? ""}`} target="_blank" rel="noreferrer">
              Se jeres side <ExternalLink className="ml-1.5 h-3 w-3" aria-hidden="true" />
            </a>
          </Button>
        }
      />

      <div className="rounded-lg border border-border bg-card p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {allDone ? "Opsætningen er klar" : `${completedCount} af ${totalCount} trin klaret`}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {allDone ? "I kan altid åbne et trin igen." : `Næste opgave: ${steps.find((item) => item.id === nextStepId)?.title ?? "Fortsæt opsætningen"}`}
            </p>
          </div>
          {focus && (
            <Button type="button" onClick={clearFocus} variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs text-muted-foreground">
              Skift formål
            </Button>
          )}
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
          <div className="h-full rounded-full bg-accent transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
        </div>
        <div
          className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]"
           
          aria-label="Vælg trin"
        >
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
                  "group h-auto w-32 sm:w-40 shrink-0 justify-start gap-2 rounded-md border px-2.5 py-2 text-left transition-colors",
                  isActive
                    ? "border-accent/40 bg-accent/10 text-foreground hover:bg-accent/15 hover:text-foreground"
                    : "border-transparent bg-secondary/50 text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold tabular-nums",
                    isDone
                      ? "border-accent bg-accent text-accent-foreground"
                      : isActive
                        ? "border-accent/50 bg-accent/15 text-accent"
                        : "border-border bg-background text-muted-foreground",
                  )}
                >
                  {isDone ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-[10px] font-medium", isActive ? "text-accent" : "text-muted-foreground")}>Trin {i + 1}</span>
                  <span className="block truncate text-xs font-semibold">{s.title}</span>
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Ét spørgsmål der tilpasser trinene */}
      {!focus && !allDone && (
        <SectionCard title="Vælg først, hvad I vil opsætte" icon={<Target />} description="Så viser vi kun de trin, der passer til jeres virksomhed.">
          <div className="grid gap-2 sm:grid-cols-3">
            {FOCUS_OPTIONS.map((o) => (
              <Button
                key={o.value}
                type="button"
                variant="outline"
                onClick={() => setFocus(o.value)}
                className="h-auto min-h-16 justify-start rounded-md p-3 text-left hover:border-foreground/40 hover:bg-secondary/40"
              >
                <span>
                  <span className="block text-sm font-semibold text-foreground">{o.title}</span>
                  <span className="mt-0.5 block whitespace-normal text-xs font-normal leading-snug text-muted-foreground">{o.body}</span>
                </span>
              </Button>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Det valgte trin: video + én handling */}
      {step && (focus || allDone) && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-6">
            <StepVideo url={videos[step.id]} title={step.title} />
            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-bold text-accent">TRIN {index + 1} AF {totalCount}</span>
                <span className="text-xs font-medium text-muted-foreground">Du ser dette trin nu</span>
              </div>
              <h3 className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
                {step.title}
                {stepDone && <CheckCircle2 className="h-5 w-5 text-accent" aria-label="Klaret" />}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              {step.tip && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Tip: {step.tip}</p>}

              {missing.length > 0 && (
                <div className="mt-3 space-y-1 rounded-lg bg-secondary/50 p-2.5">
                  {missing.map((r) => (
                    <button key={r.label} type="button" onClick={() => onNavigate(r.tab)} className="flex w-full items-center gap-2 text-left text-xs text-foreground hover:underline">
                      <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                      Kræver først: {r.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                {index > 0 && (
                  <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setSelected(steps[index - 1].id)} aria-label="Forrige trin">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  className="h-10 gap-2"
                  variant={stepDone ? "outline" : "default"}
                  disabled={missing.length > 0}
                  onClick={() => onNavigate(step.tab(counts), step.action?.(counts) ?? null)}
                >
                  {step.cta(counts)} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
                {index < steps.length - 1 && (
                  <Button variant="ghost" className="h-10" onClick={() => setSelected(steps[index + 1].id)}>
                    Se næste trin <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
