import { Star } from "lucide-react";
import { SectionCard } from "@/components/admin/shared/AdminUI";
import { ReviewInsights } from "./shared";

export default function ReviewsInsights({ insights }: { insights: ReviewInsights }) {
  if (insights.total === 0) return null;
  return (
    <SectionCard title="Fordeling" icon={<Star />} description="Hvordan stjerneratings fordeler sig samlet på platformen">
      <ul className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((n) => {
          const count = insights.distribution[n] || 0;
          const pct = insights.total ? (count / insights.total) * 100 : 0;
          return (
            <li key={n} className="flex items-center gap-3 text-xs">
              <span className="flex w-10 items-center gap-0.5 text-foreground">
                {n} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-20 text-right tabular-nums text-muted-foreground">{count} · {pct.toFixed(0)}%</span>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}