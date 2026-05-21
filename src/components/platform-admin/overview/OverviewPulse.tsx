import { ShoppingCart, DollarSign, Users, MessageCircle, Activity, Clock, CreditCard, Star, AlertTriangle } from "lucide-react";
import { SectionCard } from "@/components/admin/shared/AdminUI";
import { PulseCard, ActionCard } from "./Cards";
import { fmt, fmtKr, type OperationalPulse } from "./shared";

interface Props {
  pulse: OperationalPulse | undefined;
  onNavigate?: (tab: string) => void;
}

/** Pulse-strip + operationel arbejdskø — live i dag, klik fører til relevant fane. */
export const OverviewPulse = ({ pulse, onNavigate }: Props) => (
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
      description="Klik på et kort for at gå til den relevante fane"
    >
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        <ActionCard count={pulse?.trialExpiring ?? 0} label="Trial udløber snart" hint="Inden for 3 dage"
          icon={Clock} tone="warn" onClick={() => onNavigate?.("businesses")} />
        <ActionCard count={pulse?.pastDue ?? 0} label="Forfaldne betalinger" hint="Past due / unpaid"
          icon={CreditCard} tone="danger" onClick={() => onNavigate?.("subscriptions")} />
        <ActionCard count={pulse?.unansweredChats ?? 0} label="Ubesvarede samtaler" hint="Over 2 timer uden svar"
          icon={MessageCircle} tone="warn" onClick={() => onNavigate?.("livechat")} />
        <ActionCard count={pulse?.lowRatedReviews ?? 0} label="Lave anmeldelser" hint="≤ 2 stjerner sidste 7 dage"
          icon={Star} tone="warn" onClick={() => onNavigate?.("reviews")} />
        <ActionCard count={pulse?.unverifiedBiz ?? 0} label="Uverificerede virksomheder" hint="Aktive uden verifikation"
          icon={AlertTriangle} tone="info" onClick={() => onNavigate?.("businesses")} />
      </div>
    </SectionCard>
  </>
);