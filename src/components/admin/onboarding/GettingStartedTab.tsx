// "Kom godt i gang" — fast fane i virksomhedspanelet.
// Bruger samme layout-sprog som de øvrige faner: PageHeader øverst,
// nøgletal-kort, og indhold i SectionCard'er. To kolonner på store skærme,
// én kolonne på mobil/tablet.
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2, Inbox, MessageCircle, Star, LifeBuoy, BookOpen, Sparkles,
  Clock, ChevronDown, ExternalLink, ListChecks, Rocket, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageHeader, SectionCard, StatCard } from "@/components/admin/shared/AdminUI";
import { FOCUS_OPTIONS, type OnboardingStepId } from "./steps";
import OnboardingStepCard from "./OnboardingStepCard";
import { useOnboardingSignals } from "@/hooks/useOnboardingSignals";
import { ListCardSkeleton, PageHeaderSkeleton } from "@/components/admin/shared/Skeletons";

type Props = {
  business: any;
  onNavigate: (tab: string, action?: string | null) => void;
};

const NEXT_LEVEL_LINKS = [
  { icon: Inbox, title: "Leads", body: "Modtag kundehenvendelser fra Serviceydere.", tab: "settings" },
  { icon: MessageCircle, title: "Livechat", body: "Lad besøgende skrive direkte til jer.", tab: "settings" },
  { icon: Star, title: "Anmeldelser", body: "Bed kunder om en anmeldelse efter besøg.", tab: "reviews" },
];

const RESOURCES = [
  { title: "Brugsanvisning til ruteplanlæggeren", body: "Søgbar guide til hver funktion — med eksempel og trin. Kan hentes som PDF.", href: "/software/funktioner" },
  { title: "Ofte stillede spørgsmål", body: "Aftaler, bestillinger, priser og medarbejder-app.", href: "/hjaelp#faq" },
  { title: "Prisguides", body: "Se markedspriser i jeres branche som udgangspunkt.", href: "/guides/priser-2026" },
  { title: "Kontakt os", body: "Sidder I fast? Skriv til os — vi svarer på hverdage.", href: "/kontakt" },
];

export default function GettingStartedTab({ business, onNavigate }: Props) {
  const {
    counts, isLoading, done, skipped, toggleSkip, steps, nextLevelSteps,
    focus, setFocus, clearFocus, completedCount, totalCount, allDone, nextStepId,
  } = useOnboardingSignals(business);
  const [manualExpanded, setManualExpanded] = useState<OnboardingStepId | "none" | null>(null);
  const [showNextLevel, setShowNextLevel] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const wasDone = useRef<boolean | null>(null);
  useEffect(() => {
    if (isLoading || !counts) return;
    if (wasDone.current === false && allDone) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 6000);
      return () => clearTimeout(t);
    }
    wasDone.current = allDone;
  }, [allDone, isLoading, counts]);

  const expandedId = manualExpanded === null ? nextStepId : manualExpanded;
  const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const publicHref = `/v/${business?.slug ?? ""}`;
  const activeSteps = steps.filter((s) => !done[s.id]);
  const doneSteps = steps.filter((s) => done[s.id]);

  if (isLoading || !counts) {
    return (
      <div className="space-y-4">
        <PageHeaderSkeleton withAction={false} />
        <ListCardSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kom godt i gang"
        description={
          allDone
            ? "Opsætningen er færdig — jeres side er klar til kunder."
            : `${totalCount} ting skal på plads, før I kan tage imod jeres første kunde.`
        }
        action={
          <div className="flex w-full gap-2 sm:w-auto">
            {focus && (
              <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={clearFocus}>
                <Target className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Skift formål
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="h-9 flex-1 text-xs sm:flex-none">
              <a href={publicHref} target="_blank" rel="noreferrer">
                Se jeres side
                <ExternalLink className="ml-1.5 h-3 w-3" aria-hidden="true" />
              </a>
            </Button>
          </div>
        }
      />

      {/* Nøgletal — samme stat-kort som Overblik */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatCard
          label="Fremgang"
          value={`${pct}%`}
          icon={<Rocket />}
          tone={allDone ? "ok" : "accent"}
          hint={`${completedCount} af ${totalCount} trin`}
        />
        <StatCard
          label="Mangler"
          value={activeSteps.length}
          icon={<ListChecks />}
          tone={activeSteps.length ? "warn" : "ok"}
          hint={activeSteps.length ? "Trin tilbage" : "Alt er på plads"}
        />
        <StatCard label="Færdige" value={doneSteps.length} icon={<CheckCircle2 />} tone="ok" hint="Markeres automatisk" />
        <StatCard label="Tidsforbrug" value="~15 min" icon={<Clock />} hint="Typisk samlet opsætning" />
      </div>

      {/* Fremgangslinje */}
      <SectionCard className={cn(allDone && "border-accent/40")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
              {allDone ? "I er live" : `Velkommen${business?.name ? `, ${business.name}` : ""}`}
            </h3>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
              {allDone
                ? "Medarbejderne kan logge ind, og kunder kan finde jer."
                : "Trinene markeres færdige automatisk — I skal ikke krydse af manuelt."}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
              allDone ? "bg-accent/10 text-accent" : "bg-secondary text-foreground",
              celebrate && "animate-pulse",
            )}
          >
            {completedCount} af {totalCount}
          </span>
        </div>
        <div
          className="flex gap-1.5"
          role="progressbar"
          aria-label="Opsætningens fremgang"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={cn(
                "h-1.5 flex-1 rounded-full bg-secondary transition-colors duration-500",
                done[s.id] && (allDone ? "bg-accent" : "bg-foreground"),
                !done[s.id] && s.id === nextStepId && "bg-foreground/30",
              )}
              style={{ transitionDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      </SectionCard>

      {/* Ét spørgsmål der tilpasser guiden */}
      {!focus && !allDone && (
        <SectionCard
          title="Hvad vil I bruge Serviceydere til?"
          icon={<Target />}
          description="Vi skjuler de trin I ikke har brug for. Kan ændres senere."
        >
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start">
        {/* Venstre: trin */}
        <div className="space-y-4">
          {activeSteps.length > 0 && (
            <SectionCard
              title={`Skal på plads (${activeSteps.length})`}
              icon={<ListChecks />}
              description="Start øverst — vi åbner det rigtige sted i panelet for jer."
            >
              <div className="space-y-2">
                {activeSteps.map((step) => (
                  <OnboardingStepCard
                    key={step.id}
                    step={step}
                    number={steps.indexOf(step) + 1}
                    counts={counts}
                    done={false}
                    current={step.id === nextStepId}
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
            </SectionCard>
          )}

          {allDone && (
            <SectionCard
              title="Grundopsætningen er på plads"
              icon={<CheckCircle2 />}
              description="Medarbejderne kan logge ind og se deres opgaver. Næste niveau:"
              className="border-accent/30"
            >
              <div className="grid gap-2 sm:grid-cols-3">
                {NEXT_LEVEL_LINKS.map((n) => (
                  <button
                    key={n.title}
                    type="button"
                    onClick={() => onNavigate(n.tab)}
                    className="rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-foreground/30 hover:bg-secondary/40"
                  >
                    <n.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <p className="mt-1.5 text-sm font-semibold text-foreground">{n.title}</p>
                    <p className="text-xs leading-snug text-muted-foreground">{n.body}</p>
                  </button>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Færdige trin */}
          {doneSteps.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <button
                type="button"
                onClick={() => setShowDone((v) => !v)}
                aria-expanded={showDone}
                className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span className="text-sm font-semibold text-foreground">Færdige ({doneSteps.length})</span>
                <ChevronDown
                  className={cn("ml-auto h-4 w-4 text-muted-foreground transition-transform", showDone && "rotate-180")}
                  aria-hidden="true"
                />
              </button>
              {showDone && (
                <div className="border-t border-border">
                  {doneSteps.map((step) => (
                    <OnboardingStepCard
                      key={step.id}
                      step={step}
                      counts={counts}
                      done
                      compact
                      skipped={!!skipped[step.id]}
                      expanded={false}
                      onToggleExpand={() => {}}
                      onNavigate={onNavigate}
                      onToggleSkip={() => toggleSkip(step.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Højre: frivilligt + ressourcer */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <button
              type="button"
              onClick={() => setShowNextLevel((v) => !v)}
              aria-expanded={showNextLevel}
              className="flex w-full items-start gap-2 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">Når I er klar</span>
                <span className="block text-xs text-muted-foreground">Frivilligt — blokerer ikke opstarten</span>
              </span>
              <ChevronDown
                className={cn("ml-auto mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform", showNextLevel && "rotate-180")}
                aria-hidden="true"
              />
            </button>
            {showNextLevel && (
              <div className="space-y-2 border-t border-border p-3">
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

          <SectionCard title="Ressourcer" icon={<Sparkles />}>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
              {RESOURCES.map((r) => (
                <a
                  key={r.title}
                  href={r.href}
                  className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-secondary/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{r.title}</span>
                    <span className="block truncate text-xs leading-snug text-muted-foreground">{r.body}</span>
                  </span>
                  <ExternalLink
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </a>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="h-9 flex-1 text-xs sm:flex-none">
                <a href={publicHref} target="_blank" rel="noreferrer">
                  <BookOpen className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Se din offentlige side
                </a>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-9 flex-1 text-xs sm:flex-none">
                <a href="/guides/serviceydere-ruteplanlaegger-brugerguide.pdf" target="_blank" rel="noreferrer" download>
                  <BookOpen className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Hent PDF-guide
                </a>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-9 flex-1 text-xs sm:flex-none">
                <a href="/hjaelp">
                  <LifeBuoy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Hjælp og support
                </a>
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
