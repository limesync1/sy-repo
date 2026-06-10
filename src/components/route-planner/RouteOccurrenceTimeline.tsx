// RouteOccurrenceTimeline — vandret tidslinje for tilbagevendende aftaler på
// en basisrute. Viser udførte kørsler (✓), næste planlagte kørsel og når den
// låses op, samt et par fremtidige projektioner. Pure read‑only visualisering.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, isFuture } from "date-fns";
import { da } from "date-fns/locale";
import { CheckCircle2, Clock, Lock, Repeat, Receipt, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { routeId: string };

type Occurrence = {
  id: string;
  agreement_id: string;
  occurrence_date: string;
  sequence_index: number;
  status: string;
  completed_at: string | null;
  planned_arrival: string | null;
  invoice_external_id: string | null;
  invoice_external_number: string | null;
  invoice_status: string | null;
  external_order_number: string | null;
  occurrence_number: string | null;
};

type AgreementRow = {
  agreement_id: string;
  label: string;
  agreement_number: string | null;
  occurrences: Occurrence[];
};

export const RouteOccurrenceTimeline = ({ routeId }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["route-occurrence-timeline", routeId],
    queryFn: async (): Promise<AgreementRow[]> => {
      // Find unikke agreements via route_stops på denne rute
      const { data: stops } = await supabase
        .from("route_stops")
        .select("agreement_occurrence_id, customer_name, agreement_occurrences!inner(agreement_id)")
        .eq("route_id", routeId)
        .not("agreement_occurrence_id", "is", null);

      const agreementIds = Array.from(
        new Set(
          (stops ?? [])
            .map((s: any) => s.agreement_occurrences?.agreement_id)
            .filter(Boolean) as string[],
        ),
      );
      if (agreementIds.length === 0) return [];

      const { data: occs } = await supabase
        .from("agreement_occurrences")
        .select("id, agreement_id, occurrence_date, sequence_index, status, completed_at, planned_arrival, invoice_external_id, invoice_external_number, invoice_status, external_order_number, occurrence_number")
        .in("agreement_id", agreementIds)
        .order("sequence_index", { ascending: true });

      const { data: agreementRows } = await supabase
        .from("agreements")
        .select("id, agreement_number")
        .in("id", agreementIds);
      const agreementNumberById = new Map<string, string | null>();
      for (const a of (agreementRows ?? []) as any[]) {
        agreementNumberById.set(a.id, a.agreement_number ?? null);
      }

      const byAgreement = new Map<string, Occurrence[]>();
      for (const o of (occs ?? []) as Occurrence[]) {
        if (!byAgreement.has(o.agreement_id)) byAgreement.set(o.agreement_id, []);
        byAgreement.get(o.agreement_id)!.push(o);
      }

      const labelByAgreement = new Map<string, string>();
      for (const s of (stops ?? []) as any[]) {
        const aid = s.agreement_occurrences?.agreement_id;
        if (aid && !labelByAgreement.has(aid)) {
          labelByAgreement.set(aid, s.customer_name || "Aftale");
        }
      }

      return agreementIds.map((aid) => ({
        agreement_id: aid,
        label: labelByAgreement.get(aid) ?? "Aftale",
        agreement_number: agreementNumberById.get(aid) ?? null,
        occurrences: byAgreement.get(aid) ?? [],
      }));
    },
    enabled: !!routeId,
    staleTime: 30_000,
  });

  if (isLoading || !data || data.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card/60 p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2">
        <Repeat className="h-3.5 w-3.5 text-accent" />
        Kørselshistorik
      </div>
      <div className="space-y-3">
        {data.map((row) => {
          const last = [...row.occurrences].reverse().find((o) => o.status === "completed");
          const next = row.occurrences.find((o) => o.status !== "completed");
          const projected = row.occurrences.filter(
            (o) => o.status !== "completed" && o.id !== next?.id,
          ).slice(0, 2);
          const items: Array<{ key: string; n: number; kind: "done" | "next" | "future"; date: string; planned: string | null; locked?: boolean; occ?: Occurrence }> = [];
          // Vis sidste 2 udførte for kontekst
          const completedList = row.occurrences.filter((o) => o.status === "completed").slice(-2);
          for (const c of completedList) items.push({ key: c.id, n: c.sequence_index + 1, kind: "done", date: c.occurrence_date, planned: c.planned_arrival, occ: c });
          if (next) {
            const locked = next.planned_arrival
              ? isFuture(parseISO(next.planned_arrival))
              : isFuture(parseISO(next.occurrence_date));
            items.push({ key: next.id, n: next.sequence_index + 1, kind: "next", date: next.occurrence_date, planned: next.planned_arrival, locked, occ: next });
          }
          for (const p of projected) items.push({ key: p.id, n: p.sequence_index + 1, kind: "future", date: p.occurrence_date, planned: p.planned_arrival, occ: p });

          return (
            <div key={row.agreement_id} className="space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground truncate">
                <span className="truncate">{row.label}</span>
                {row.agreement_number && (
                  <span
                    className="inline-flex items-center rounded-sm border border-border bg-muted px-1 py-px text-[9px] font-semibold text-foreground"
                    title="Aftalenummer"
                  >
                    {row.agreement_number}
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute left-0 right-0 top-3 h-px bg-border" aria-hidden />
                <ul className="relative flex items-start gap-3 overflow-x-auto pb-1">
                  {items.map((it) => (
                    <li key={it.key} className="flex shrink-0 flex-col items-center gap-1 min-w-[88px]">
                      <div
                        className={cn(
                          "relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-background",
                          it.kind === "done" && "border-accent text-accent",
                          it.kind === "next" && !it.locked && "border-foreground text-foreground",
                          it.kind === "next" && it.locked && "border-amber-500 text-amber-600",
                          it.kind === "future" && "border-muted-foreground/40 text-muted-foreground",
                        )}
                      >
                        {it.kind === "done" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {it.kind === "next" && (it.locked ? <Lock className="h-3 w-3" /> : <Clock className="h-3 w-3" />)}
                        {it.kind === "future" && <span className="text-[9px] font-semibold">{it.n}</span>}
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] font-semibold text-foreground leading-tight">{it.n}. kørsel</div>
                        {it.occ?.occurrence_number && (
                          <div
                            className="text-[9px] font-mono text-muted-foreground leading-tight"
                            title="Kørselsnummer"
                          >
                            {it.occ.occurrence_number}
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground leading-tight capitalize">
                          {format(parseISO(it.planned ?? it.date), it.planned ? "d. MMM HH:mm" : "d. MMM", { locale: da })}
                        </div>
                        {it.kind === "done" && (
                          <div className="text-[9px] text-accent font-medium">Udført</div>
                        )}
                        {it.kind === "next" && it.locked && (
                          <div className="text-[9px] text-amber-600 font-medium">Låst</div>
                        )}
                        {it.kind === "next" && !it.locked && (
                          <div className="text-[9px] text-foreground font-medium">Klar</div>
                        )}
                        {it.occ && (it.occ.invoice_external_number || it.occ.external_order_number) && (
                          <div className="mt-1 flex flex-col items-center gap-0.5">
                            {it.occ.invoice_external_number && (
                              <span
                                title={`Faktura ${it.occ.invoice_external_number} · status ${it.occ.invoice_status ?? "—"}`}
                                className={cn(
                                  "inline-flex items-center gap-0.5 rounded-sm border px-1 py-px text-[9px] font-medium",
                                  it.occ.invoice_status === "booked" || it.occ.invoice_status === "paid"
                                    ? "border-accent/40 bg-accent/10 text-accent"
                                    : "border-border bg-muted text-muted-foreground",
                                )}
                              >
                                <Receipt className="h-2.5 w-2.5" />
                                #{it.occ.invoice_external_number}
                              </span>
                            )}
                            {it.occ.external_order_number && (
                              <span
                                title={`Regnskabsordre ${it.occ.external_order_number}`}
                                className="inline-flex items-center gap-0.5 rounded-sm border border-border bg-muted px-1 py-px text-[9px] font-medium text-muted-foreground"
                              >
                                <FileText className="h-2.5 w-2.5" />
                                #{it.occ.external_order_number}
                              </span>
                            )}
                          </div>
                        )}
                        {it.kind === "done" && it.occ && !it.occ.invoice_external_number && !it.occ.external_order_number && (
                          <div className="mt-1 text-[9px] text-amber-600 font-medium" title="Faktura ikke genereret endnu">
                            ⏳ Faktura venter
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
