import { TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { SectionCard } from "@/components/admin/shared/AdminUI";
import type { OverviewSnapshot } from "./shared";

interface Props { series: OverviewSnapshot["series"]; rangeLabel: string }

/** Daglige nye ordrer, brugere og virksomheder som stacked area-chart. */
export const OverviewGrowthChart = ({ series, rangeLabel }: Props) => (
  <SectionCard
    title={<>Vækst — {rangeLabel.toLowerCase()}</>}
    icon={<TrendingUp />}
    description="Daglige nye ordrer, brugere og virksomheder"
  >
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="orders" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="users" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} fontSize={11} stroke="hsl(var(--muted-foreground))" />
          <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
          <Area type="monotone" dataKey="orders" stroke="hsl(var(--accent))" fill="url(#orders)" strokeWidth={2} name="Ordrer" />
          <Area type="monotone" dataKey="users" stroke="hsl(var(--foreground))" fill="url(#users)" strokeWidth={2} name="Nye brugere" />
          <Area type="monotone" dataKey="businesses" stroke="hsl(var(--muted-foreground))" fill="transparent" strokeWidth={2} strokeDasharray="4 4" name="Nye virksomheder" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </SectionCard>
);