// "Kom godt i gang" — fast fane i virksomhedspanelet.
// Én topbar med fremskridt ("2 af 5 trin klaret") og ét trin ad gangen med
// sin egen guide-video. Video-links styres af platform-admin
// (onboarding_videos), så videoerne kan skiftes uden kodeændring.
import { useEffect, useState } from "react";
import { ArrowRight, Check, CheckCircle2, ExternalLink, Lock, PlayCircle, Target } from "lucide-react";
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

      {/* Topbar med fremskridt — trinene kan klikkes */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">
            {allDone ? "Alle trin er klaret" : `${completedCount} af ${totalCount} trin klaret`}
          </p>
          {focus && (
            <button type="button" onClick={clearFocus} className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
              Skift formål
            </button>
          )}
        </div>
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
          role="progressbar"
          aria-label="Opsætningens fremskridt"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {steps.map((s, i) => {
            const isDone = !!done[s.id];
            const isActive = s.id === step?.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelected(s.id)}
                aria-current={isActive ? "step" : undefined}
                className="group min-w-0 text-left focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-colors duration-300",
                    isDone ? "bg-accent" : isActive ? "bg-foreground" : "bg-border group-hover:bg-foreground/30",
                  )}
                />
                <span
                  className={cn(
                    "mt-1.5 flex min-w-0 items-center gap-1 text-[11px] font-medium",
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {isDone && <Check className="h-3 w-3 shrink-0 text-accent" aria-hidden="true" />}
                  <span className="truncate">Trin {i + 1}<span className="hidden sm:inline">: {s.title}</span></span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ét spørgsmål der tilpasser trinene */}
      {!focus && !allDone && (
        <SectionCard title="Hvad vil I bruge Serviceydere til?" icon={<Target />} description="Vi skjuler de trin I ikke har brug for.">
          <div className="grid gap-2 sm:grid-cols-3">
            {FOCUS_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setFocus(o.value)}
                className="rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-foreground/40 hover:bg-secondary/40"
              >
                <p className="text-sm font-semibold text-foreground">{o.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{o.body}</p>
              </button>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Det valgte trin: video + én handling */}
      {step && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-6">
            <StepVideo url={videos[step.id]} title={step.title} />
            <div className="flex min-w-0 flex-col">
              <p className="text-xs font-semibold text-muted-foreground">Trin {index + 1} af {totalCount}</p>
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

              <div className="mt-auto flex flex-wrap gap-2 pt-4">
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
                    Næste trin
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
