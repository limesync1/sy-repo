import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Activity, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fmt, fmtKr, trendPct, type OverviewSnapshot, type OperationalPulse } from "./shared";

type Insight = {
  tone: "positive" | "negative" | "warn" | "neutral";
  icon: any;
  title: string;
  detail: string;
};

/**
 * Auto-genererer 3-5 insights ud fra snapshot + puls.
 * Mål: når en admin åbner Overblik skal de øjeblikkeligt vide
 * "hvad sker der lige nu" uden at scrolle gennem 20 tal selv.
 */
const buildInsights = (snap: OverviewSnapshot, pulse?: OperationalPulse): Insight[] => {
  const out: Insight[] = [];
  const gmvPct = trendPct(Number(snap.kpis.gmv), Number(snap.prev.gmv));
  const ordersPct = trendPct(Number(snap.kpis.orders), Number(snap.prev.orders));
  const userPct = trendPct(snap.period_counts.new_users, Number(snap.prev.users));

  /* 1. GMV-momentum */
  if (Math.abs(gmvPct) >= 5) {
    out.push({
      tone: gmvPct >= 0 ? "positive" : "negative",
      icon: gmvPct >= 0 ? TrendingUp : TrendingDown,
      title: `GMV ${gmvPct >= 0 ? "stiger" : "falder"} ${Math.abs(gmvPct).toFixed(0)}% mod forrige periode`,
      detail: `${fmtKr(Number(snap.kpis.gmv))} nu vs. ${fmtKr(Number(snap.prev.gmv))} før`,
    });
  }

  /* 2. Top-kategori — hvad driver salget? */
  const topCat = snap.top_categories[0];
  const totalCatValue = snap.top_categories.reduce((s, c) => s + Number(c.value), 0);
  if (topCat && totalCatValue > 0) {
    const share = (Number(topCat.value) / totalCatValue) * 100;
    out.push({
      tone: "neutral",
      icon: Sparkles,
      title: `${topCat.label} driver ${share.toFixed(0)}% af aktiviteten`,
      detail: `${fmt(Number(topCat.value))} hits i perioden — flest af alle kategorier`,
    });
  }

  /* 3. Genkøbs-signal */
  const repeatRate = snap.repeat.unique_customers
    ? (snap.repeat.repeat_customers / snap.repeat.unique_customers) * 100
    : 0;
  if (snap.repeat.unique_customers >= 5) {
    if (repeatRate >= 30) {
      out.push({
        tone: "positive",
        icon: Activity,
        title: `Stærk loyalitet: ${repeatRate.toFixed(0)}% genkøbsrate`,
        detail: `${snap.repeat.repeat_customers} af ${snap.repeat.unique_customers} kunder har bestilt mere end én gang`,
      });
    } else if (repeatRate < 10) {
      out.push({
        tone: "warn",
        icon: AlertTriangle,
        title: `Lav genkøbsrate (${repeatRate.toFixed(0)}%)`,
        detail: `Kun ${snap.repeat.repeat_customers} af ${snap.repeat.unique_customers} kunder kommer tilbage`,
      });
    }
  }

  /* 4. Brugervækst */
  if (Math.abs(userPct) >= 20 && snap.period_counts.new_users >= 3) {
    out.push({
      tone: userPct >= 0 ? "positive" : "negative",
      icon: userPct >= 0 ? TrendingUp : TrendingDown,
      title: `Brugertilstrømning ${userPct >= 0 ? "op" : "ned"} ${Math.abs(userPct).toFixed(0)}%`,
      detail: `${fmt(snap.period_counts.new_users)} nye brugere mod ${fmt(Number(snap.prev.users))} sidste periode`,
    });
  }

  /* 5. Operationelt rødt flag */
  if (pulse) {
    const hot =
      (pulse.pastDue > 0 ? pulse.pastDue : 0) +
      (pulse.unansweredChats > 0 ? pulse.unansweredChats : 0) +
      (pulse.lowRatedReviews > 0 ? pulse.lowRatedReviews : 0);
    if (hot >= 3) {
      out.push({
        tone: "warn",
        icon: AlertTriangle,
        title: `${hot} operationelle ting kræver opmærksomhed`,
        detail: `${pulse.pastDue} forfaldne · ${pulse.unansweredChats} ubesvarede chats · ${pulse.lowRatedReviews} lave reviews`,
      });
    } else if (hot === 0 && pulse.ordersToday > 0) {
      out.push({
        tone: "positive",
        icon: Sparkles,
        title: "Alt kører glat — ingen åbne røde flag",
        detail: `${pulse.ordersToday} ordrer og ${fmtKr(pulse.gmvToday)} i dag`,
      });
    }
  }

  /* 6. Ordrer-vs-GMV divergens (fx mange små ordrer eller få store) */
  if (Math.abs(gmvPct - ordersPct) >= 15 && snap.kpis.orders > 5) {
    out.push({
      tone: "neutral",
      icon: Lightbulb,
      title:
        gmvPct > ordersPct
          ? "Ordrerne bliver større — værdi vokser hurtigere end antal"
          : "Mange små ordrer — antal vokser hurtigere end værdi",
      detail: `Snitordre ${fmtKr(Number(snap.kpis.avg_order))}`,
    });
  }

  return out.slice(0, 4);
};

const TONE_STYLES: Record<Insight["tone"], string> = {
  positive: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700",
  negative: "border-red-500/30 bg-red-500/5 text-red-700",
  warn: "border-amber-500/30 bg-amber-500/5 text-amber-700",
  neutral: "border-border bg-card text-foreground",
};

export const OverviewInsights = ({
  snapshot, pulse,
}: { snapshot: OverviewSnapshot; pulse?: OperationalPulse }) => {
  const insights = buildInsights(snapshot, pulse);
  if (insights.length === 0) return null;

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-background">
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Smart sammendrag</p>
            <p className="text-[11px] text-muted-foreground">Auto-genereret ud fra periodens data</p>
          </div>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {insights.map((ins, i) => (
            <li
              key={i}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
                TONE_STYLES[ins.tone],
              )}
            >
              <ins.icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-semibold leading-tight text-foreground">{ins.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{ins.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default OverviewInsights;