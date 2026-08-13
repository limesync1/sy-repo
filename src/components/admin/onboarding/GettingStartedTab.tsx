// "Kom godt i gang" — fast fane i virksomhedspanelet (ikke en modal).
// Fremgang detekteres automatisk; brugeren arbejder i panelet og kommer
// tilbage hertil. Når alle trin er grønne bliver fanen til et kort
// afslutningskort med forslag til næste niveau.
import { useMemo, useState } from "react";
import { CheckCircle2, Inbox, MessageCircle, Star, LifeBuoy, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ONBOARDING_STEPS, type OnboardingStepId } from "./steps";
import OnboardingStepCard from "./OnboardingStepCard";
import { useOnboardingSignals } from "@/hooks/useOnboardingSignals";
import { ListCardSkeleton, PageHeaderSkeleton } from "@/components/admin/shared/Skeletons";

type Props = {
  business: any;
  onNavigate: (tab: string) => void;
};

const NEXT_LEVEL = [
  { icon: Inbox, title: "Leads", body: "Modtag kundehenvendelser fra Serviceydere.", tab: "settings" },
  { icon: MessageCircle, title: "Livechat", body: "Lad besøgende skrive direkte til jer.", tab: "settings" },
  { icon: Star, title: "Anmeldelser", body: "Bed kunder om en anmeldelse efter besøg.", tab: "reviews" },
];

export default function GettingStartedTab({ business, onNavigate }: Props) {
  const { counts, isLoading, done, skipped, toggleSkip, completedCount, totalCount, allDone, nextStepId } =
    useOnboardingSignals(business);
  const [manualExpanded, setManualExpanded] = useState<OnboardingStepId | null>(null);

  // Som standard er kun det aktuelle trin foldet ud.
  const expandedId = manualExpanded ?? nextStepId;
  const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  const resources = useMemo(
    () => [
      { icon: BookOpen, label: "Se din offentlige side", href: `/v/${business?.slug ?? ""}` },
      { icon: LifeBuoy, label: "Hjælp og support", href: "/hjaelp" },
    ],
    [business?.slug],
  );

  if (isLoading || !counts) {
    return (
      <div className="w-full space-y-4">
        <PageHeaderSkeleton withAction={false} />
        <ListCardSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      {/* Progress-header */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-foreground sm:text-xl">Kom godt i gang</h1>
            <p className="text-sm text-muted-foreground">
              {allDone
                ? "Opsætningen er færdig — I er klar til kunder."
                : "Klar til at tage imod jeres første kunde."}
            </p>
          </div>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold tabular-nums text-foreground">
            {completedCount} af {totalCount}
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={cn("h-full rounded-full bg-foreground transition-[width] duration-500", allDone && "bg-accent")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Trinene markeres færdige automatisk — I skal ikke krydse af manuelt.
        </p>
      </div>

      {allDone && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-bold text-foreground">Grundopsætningen er på plads</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Medarbejderne kan logge ind og se deres ruter. Næste niveau:
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {NEXT_LEVEL.map((n) => (
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

      {/* Trin-liste */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {ONBOARDING_STEPS.map((step) => (
          <OnboardingStepCard
            key={step.id}
            step={step}
            counts={counts}
            done={done[step.id]}
            skipped={!!skipped[step.id]}
            expanded={expandedId === step.id}
            onToggleExpand={() => setManualExpanded((cur) => (cur === step.id ? ("" as any) : step.id))}
            onNavigate={onNavigate}
            onToggleSkip={() => toggleSkip(step.id)}
          />
        ))}
      </div>

      {/* Ressourcer */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Ressourcer
        </p>
        <div className="flex flex-wrap gap-2">
          {resources.map((r) => (
            <Button key={r.label} asChild size="sm" variant="outline" className="h-8 text-xs">
              <a href={r.href} target={r.href.startsWith("/v/") ? "_blank" : undefined} rel="noreferrer">
                <r.icon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                {r.label}
              </a>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
