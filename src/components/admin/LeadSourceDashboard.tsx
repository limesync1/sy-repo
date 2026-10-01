import { Users, Trophy, ArrowRight } from "lucide-react";
import { FacebookBrandIcon, InstagramBrandIcon } from "@/components/shared/MetaBrandIcons";
import type { LeadDetailLead } from "@/components/admin/LeadDetailDialog";
import { cn } from "@/lib/utils";

type Account = { key: string; label: string; source: string; total: number; customers: number; won: number };

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

/** Overblik over leads fra Facebook og Instagram, og hvor mange der bliver til kunder. */
export function LeadSourceDashboard({ leads, accounts, activeAccount, onPickAccount }: {
  leads: LeadDetailLead[];
  accounts: Account[];
  activeAccount: string;
  onPickAccount: (key: string) => void;
}) {
  const bySource = (s: string) => leads.filter((l) => (l.quote_request?.source || "serviceydere") === s);
  const rows = [
    { key: "facebook", label: "Facebook", icon: <FacebookBrandIcon className="h-5 w-5" />, list: bySource("facebook") },
    { key: "instagram", label: "Instagram", icon: <InstagramBrandIcon className="h-5 w-5" />, list: bySource("instagram") },
  ];
  const metaTotal = rows.reduce((n, r) => n + r.list.length, 0);
  if (metaTotal === 0) return null;

  return (
    <section aria-labelledby="lead-sources-title" className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="lead-sources-title" className="text-base font-semibold text-foreground">Leads fra Meta</h2>
          <p className="text-xs text-muted-foreground">Hvor mange leads der kommer ind, og hvor mange der bliver til kunder.</p>
        </div>
        <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground tabular-nums">{metaTotal}</span> leads i alt</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((r) => {
          const customers = r.list.filter((l) => l.customer_id).length;
          const won = r.list.filter((l) => l.status === "won").length;
          return (
            <div key={r.key} className="rounded-lg border border-border bg-secondary/30 p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-card">{r.icon}</span>
                <p className="text-sm font-semibold text-foreground">{r.label}</p>
                <p className="ml-auto text-2xl font-semibold tabular-nums text-foreground">{r.list.length}</p>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-card px-3 py-2">
                  <dt className="flex items-center gap-1 text-muted-foreground"><Users className="h-3 w-3" /> Oprettet som kunde</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{customers}</dd>
                </div>
                <div className="rounded-md bg-card px-3 py-2">
                  <dt className="flex items-center gap-1 text-muted-foreground"><Trophy className="h-3 w-3" /> Vundet</dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{won} <span className="font-normal text-muted-foreground">({pct(won, r.list.length)}%)</span></dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>

      {accounts.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Indbakke pr. side og konto</p>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {accounts.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => onPickAccount(a.key)}
                aria-pressed={activeAccount === a.key}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                  activeAccount === a.key ? "bg-secondary" : "bg-card hover:bg-secondary/50",
                )}
              >
                {a.source === "instagram" ? <InstagramBrandIcon className="h-4 w-4 shrink-0" /> : <FacebookBrandIcon className="h-4 w-4 shrink-0" />}
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">{a.label}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{a.total} leads · {a.won} vundet</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default LeadSourceDashboard;
