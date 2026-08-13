// "Kom godt i gang" — fast fane i virksomhedspanelet (ikke en modal).
// Opbygget som Discords Server Guide: en personlig hilsen i toppen, en kort
// liste konkrete opgaver der markeres færdige automatisk, et frivilligt
// "næste niveau"-spor og en ressource-sektion nederst.
import { useState } from "react";
import {
  CheckCircle2, Inbox, MessageCircle, Star, LifeBuoy, BookOpen, Sparkles,
  Clock, ChevronDown, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FOCUS_OPTIONS, type OnboardingStepId } from "./steps";
import OnboardingStepCard from "./OnboardingStepCard";
import { useOnboardingSignals } from "@/hooks/useOnboardingSignals";
import { ListCardSkeleton, PageHeaderSkeleton } from "@/components/admin/shared/Skeletons";

type Props = {
  business: any;
  onNavigate: (tab: string) => void;
};

const NEXT_LEVEL_LINKS = [
  { icon: Inbox, title: "Leads", body: "Modtag kundehenvendelser fra Serviceydere.", tab: "settings" },
  { icon: MessageCircle, title: "Livechat", body: "Lad besøgende skrive direkte til jer.", tab: "settings" },
  { icon: Star, title: "Anmeldelser", body: "Bed kunder om en anmeldelse efter besøg.", tab: "reviews" },
];

const RESOURCES = [
  { title: "Aftaler vs. bestillinger", body: "Hvad forskellen er, og hvornår I bruger hvad.", href: "/hjaelp#faq" },
  { title: "Prisberegner på 5 minutter", body: "Sæt m²-, stk- eller timepris op på en service.", href: "/hjaelp#faq" },
  { title: "Medarbejder-appen", body: "Hvad jeres team ser, og hvordan de melder færdig.", href: "/hjaelp#faq" },
];

export default function GettingStartedTab({ business, onNavigate }: Props) {
  const {
    counts, isLoading, done, skipped, toggleSkip, steps, nextLevelSteps,
    focus, setFocus, completedCount, totalCount, allDone, nextStepId,
  } = useOnboardingSignals(business);
  const [manualExpanded, setManualExpanded] = useState<OnboardingStepId | "none" | null>(null);
  const [showNextLevel, setShowNextLevel] = useState(false);

  // Som standard er kun det aktuelle trin foldet ud.
  const expandedId = manualExpanded === null ? nextStepId : manualExpanded;
  const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const publicHref = `/v/${business?.slug ?? ""}`;

  if (isLoading || !counts) {
    return (
      <div className="w-full space-y-4">
        <PageHeaderSkeleton withAction={false} />
        <ListCardSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      {/* Velkomst + fremgang */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground sm:text-xl">
              Velkommen{business?.name ? `, ${business.name}` : ""}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {allDone
                ? "Opsætningen er færdig — I er klar til kunder."
                : `Her er de ${totalCount} ting der skal på plads, før I kan tage imod jeres første kunde.`}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-bold tabular-nums text-foreground">
            {completedCount} af {totalCount}
          </span>
        </div>
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-label="Opsætningens fremgang"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn("h-full rounded-full bg-foreground transition-[width] duration-500", allDone && "bg-accent")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" /> Tager ca. 15 minutter
          </span>
          <span>Trinene markeres færdige automatisk — I skal ikke krydse af manuelt.</span>
        </div>
      </div>

      {/* Ét spørgsmål der tilpasser guiden */}
      {!focus && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-bold text-foreground">Hvad vil I bruge Serviceydere til?</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Vi skjuler de trin I ikke har brug for. Kan ændres senere.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {FOCUS_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setFocus(o.value)}
                className="rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-foreground/40"
              >
                <p className="text-sm font-semibold text-foreground">{o.title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{o.body}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {allDone && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-bold text-foreground">Grundopsætningen er på plads</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Medarbejderne kan logge ind og se deres opgaver. Næste niveau:
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {NEXT_LEVEL_LINKS.map((n) => (
              <button
                key={n.title}
                type="button"
                onClick={() => onNavigate(n.tab)}
                className="rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-foreground/30"
              >
                <n.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="mt-1.5 text-sm font-semibold text-foreground">{n.title}</p>
                <p className="text-[11px] leading-snug text-muted-foreground">{n.body}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Kerne-trin */}
      <div>
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Skal på plads
        </p>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {steps.map((step, i) => (
            <OnboardingStepCard
              key={step.id}
              step={step}
              number={i + 1}
              counts={counts}
              done={done[step.id]}
              skipped={!!skipped[step.id]}
              expanded={expandedId === step.id}
              onToggleExpand={() =>
                setManualExpanded((cur) => ((cur === null ? nextStepId : cur) === step.id ? "none" : step.id))
              }
              onNavigate={onNavigate}
              onToggleSkip={() => toggleSkip(step.id)}
            />
          ))}
        </div>
      </div>

      {/* Frivillige trin — foldet sammen */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <button
          type="button"
          onClick={() => setShowNextLevel((v) => !v)}
          aria-expanded={showNextLevel}
          className="flex w-full items-center gap-2 px-3 py-3 text-left sm:px-4"
        >
          <span className="text-sm font-semibold text-foreground">Når I er klar</span>
          <span className="text-[11px] text-muted-foreground">Frivilligt — blokerer ikke opstarten</span>
          <ChevronDown
            className={cn("ml-auto h-4 w-4 text-muted-foreground transition-transform", showNextLevel && "rotate-180")}
            aria-hidden="true"
          />
        </button>
        {showNextLevel && (
          <div className="border-t border-border">
            {nextLevelSteps.map((step) => (
              <OnboardingStepCard
                key={step.id}
                step={step}
                counts={counts}
                done={done[step.id]}
                skipped={!!skipped[step.id]}
                expanded={expandedId === step.id}
                onToggleExpand={() => setManualExpanded((cur) => (cur === step.id ? "none" : step.id))}
                onNavigate={onNavigate}
                onToggleSkip={() => toggleSkip(step.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Ressourcer */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Ressourcer
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {RESOURCES.map((r) => (
            <a
              key={r.title}
              href={r.href}
              className="rounded-xl border border-border bg-background p-3 transition-colors hover:border-foreground/30"
            >
              <p className="text-sm font-semibold text-foreground">{r.title}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{r.body}</p>
            </a>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
            <a href={publicHref} target="_blank" rel="noreferrer">
              <BookOpen className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Se din offentlige side
              <ExternalLink className="ml-1.5 h-3 w-3" aria-hidden="true" />
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
            <a href="/hjaelp">
              <LifeBuoy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Hjælp og support
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
