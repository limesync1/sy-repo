import { ShoppingCart, DollarSign, Users, MessageCircle, Activity, Clock, CreditCard, Star, AlertTriangle } from "lucide-react";
import { SectionCard } from "@/components/admin/shared/AdminUI";
import { PulseCard, ActionCard } from "./Cards";
import { fmt, fmtKr, type OperationalPulse } from "./shared";

interface Props {
  pulse: OperationalPulse | undefined;
  onNavigate?: (tab: string) => void;
}

/** Pulse-strip + operationel arbejdskø — live i dag, klik fører til relevant fane.
 *  Handlings-kort sorteres efter alvorsgrad (danger > warn > info) og dernæst
 *  efter antal, så det mest presserende altid står først. */
export const OverviewPulse = ({ pulse, onNavigate }: Props) => {
  const TONE_RANK: Record<string, number> = { danger: 0, warn: 1, info: 2 };
  const actions = [
    { key: "trial", count: pulse?.trialExpiring ?? 0, label: "Trial udløber snart", hint: "Inden for 3 dage",
      icon: Clock, tone: "warn" as const, tab: "businesses" },
    { key: "pastdue", count: pulse?.pastDue ?? 0, label: "Forfaldne betalinger", hint: "Past due / unpaid",
      icon: CreditCard, tone: "danger" as const, tab: "subscriptions" },
    { key: "chats", count: pulse?.unansweredChats ?? 0, label: "Ubesvarede samtaler", hint: "Over 2 timer uden svar",
      icon: MessageCircle, tone: "warn" as const, tab: "livechat" },
    { key: "reviews", count: pulse?.lowRatedReviews ?? 0, label: "Lave anmeldelser", hint: "≤ 2 stjerner sidste 7 dage",
      icon: Star, tone: "warn" as const, tab: "reviews" },
    { key: "unverified", count: pulse?.unverifiedBiz ?? 0, label: "Uverificerede virksomheder", hint: "Aktive uden verifikation",
      icon: AlertTriangle, tone: "info" as const, tab: "businesses" },
  ].sort((a, b) => {
    // Aktive ting (count>0) før tomme; ellers sorteret på tone og dernæst på count desc.
    const aActive = a.count > 0 ? 0 : 1;
    const bActive = b.count > 0 ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    if (a.tone !== b.tone) return TONE_RANK[a.tone] - TONE_RANK[b.tone];
    return b.count - a.count;
  });
  return (
   <>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <PulseCard label="Ordrer i dag" value={fmt(pulse?.ordersToday ?? 0)} icon={ShoppingCart} dot="blue" />
      <PulseCard label="GMV i dag" value={fmtKr(pulse?.gmvToday ?? 0)} icon={DollarSign} dot="emerald" />
      <PulseCard label="Nye signups i dag" value={fmt(pulse?.signupsToday ?? 0)} icon={Users} dot="violet" />
      <PulseCard label="Åbne samtaler" value={fmt(pulse?.openChats ?? 0)} icon={MessageCircle} dot="amber" />
    </div>

    <SectionCard
      title="Kræver handling"
      icon={<Activity />}
      description="Sorteret efter alvorsgrad — det mest presserende først"
    >
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {actions.map((a) => (
          <ActionCard key={a.key} count={a.count} label={a.label} hint={a.hint}
            icon={a.icon} tone={a.tone} onClick={() => onNavigate?.(a.tab)} />
        ))}
      </div>
    </SectionCard>
   </>
  );
};