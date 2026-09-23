import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import {
  Building2,
  ClipboardList,
  Flag,
  MapPin,
  Phone,
  Route as RouteIcon,
  StickyNote,
} from "lucide-react";
import { stripPrices } from "@/lib/employee-display";
import { cn } from "@/lib/utils";

type ReceiptRouteData = {
  route: any;
  stops: any[];
  employee?: { name?: string | null } | null;
};

type Props = {
  data: ReceiptRouteData;
  showNotes: boolean;
  showContact: boolean;
  showTasks: boolean;
  compact: boolean;
  preview?: boolean;
};

export const RouteReceiptDocument = ({
  data,
  showNotes,
  showContact,
  showTasks,
  compact,
  preview = false,
}: Props) => {
  const { route, stops, employee } = data;
  const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
  const businessName = route.businesses?.name || "";
  const distance = route.total_distance_km != null
    ? `${Number(route.total_distance_km).toFixed(1)} km`
    : "—";

  return (
    <article
      className={cn(
        "receipt-document overflow-hidden border border-border bg-card text-foreground shadow-sm",
        preview ? "rounded-[6px]" : "mx-auto w-full max-w-[210mm] rounded-[6px] print:max-w-none print:rounded-none print:border-0 print:shadow-none",
      )}
    >
      <div className="h-1 bg-accent print:bg-foreground" />
      <div className={cn("receipt-document-inner", preview ? "p-3.5 sm:p-5" : "p-4 sm:p-8 lg:p-10 print:p-0")}>
        <header className="receipt-header border-b border-border pb-4 sm:pb-5">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
                <ClipboardList className="h-3.5 w-3.5" /> Ruteliste
              </p>
              <h1 className={cn("mt-1.5 break-words font-semibold leading-tight", preview ? "text-lg" : "text-xl sm:text-2xl")}>
                {route.name || "Rute"}
              </h1>
              <p className="mt-1 text-xs capitalize text-muted-foreground sm:text-sm">
                {format(parseISO(route.route_date), "EEEE d. MMMM yyyy", { locale: da })}
              </p>
            </div>

            {(businessName || employee?.name) && (
              <div className="min-w-0 border-t border-border pt-3 sm:max-w-[42%] sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
                  <Building2 className="h-3 w-3" /> Udført af
                </p>
                {businessName && <p className="mt-1 break-words text-sm font-semibold">{businessName}</p>}
                {employee?.name && <p className="mt-0.5 break-words text-xs text-muted-foreground">{employee.name}</p>}
              </div>
            )}
          </div>

          <dl className="mt-4 grid grid-cols-2 divide-x divide-border rounded-[4px] border border-border bg-secondary/30 py-2.5">
            <ReceiptMeta icon={<Flag className="h-3.5 w-3.5" />} label="Stop" value={String(sorted.length)} />
            <ReceiptMeta icon={<RouteIcon className="h-3.5 w-3.5" />} label="Distance" value={distance} />
          </dl>

          {route.start_address && (
            <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 break-words"><span className="font-medium text-foreground">Start:</span> {route.start_address}</span>
            </p>
          )}
        </header>

        <div className="flex items-center gap-2 py-3">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Stop på ruten</span>
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] tabular-nums text-muted-foreground">{sorted.length} stop</span>
        </div>

        {sorted.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Ingen stop på ruten.</p>
        ) : (
          <ol className="receipt-stops divide-y divide-border">
            {sorted.map((stop, index) => {
              const task = stop.service_summary ? stripPrices(stop.service_summary) : "";
              return (
                <li key={stop.id} className={cn("receipt-stop", compact ? "py-2.5" : "py-4")}>
                  <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-2.5 sm:grid-cols-[32px_minmax(0,1fr)] sm:gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-foreground text-[11px] font-semibold tabular-nums text-background sm:h-8 sm:w-8">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <h2 className="break-words text-sm font-semibold leading-snug sm:text-[15px]">{stop.customer_name || "Stop"}</h2>
                      <div className="mt-1 grid gap-1 text-xs text-muted-foreground">
                        {stop.address && (
                          <p className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /><span className="break-words">{stop.address}</span></p>
                        )}
                        {showContact && stop.customer_phone && (
                          <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" /><span className="break-all tabular-nums">{stop.customer_phone}</span></p>
                        )}
                      </div>
                      {showTasks && task && (
                        <div className="mt-2 border-l-2 border-accent bg-secondary/30 px-2.5 py-1.5 text-xs">
                          <p className="text-[9px] font-semibold uppercase text-muted-foreground">Opgave</p>
                          <p className="mt-0.5 break-words">{task}</p>
                        </div>
                      )}
                      {showNotes && stop.notes && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs">
                          <StickyNote className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                          <p className="break-words italic">{stop.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <footer className="receipt-footer mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 text-[10px] text-muted-foreground">
          <p>{preview ? "Forhåndsvisning" : "Udskrevet"} · {new Date().toLocaleDateString("da-DK")}</p>
          <p className="font-semibold text-foreground">Serviceydere</p>
        </footer>
      </div>
    </article>
  );
};

const ReceiptMeta = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <div className="min-w-0 px-3 sm:px-4">
    <dt className="flex items-center gap-1 text-[9px] font-semibold uppercase text-muted-foreground">{icon}{label}</dt>
    <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums sm:text-base">{value}</dd>
  </div>
);

export default RouteReceiptDocument;