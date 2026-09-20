/**
 * EtaBreakdown — viser om ETA er live (nu) eller planlagt (fremtidig
 * afgangstid), og lader brugeren skifte mellem grundtid og vores
 * korrigerede tid (med dansk køretidsbuffer).
 *
 * Bruges på:
 * - medarbejder-rutekortet (EmployeeRoute) — viser status for den aktuelle leg
 * - rute-planlægger (RoutePlanner / RouteEditSheet) — viser status pr. rute
 */
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Clock, Calendar as CalendarIcon, Info } from "lucide-react";

export type EtaInfo = {
  duration_s?: number | null;
  duration_raw_s?: number | null;
  traffic_multiplier?: number;
  base_multiplier?: number;
  override_applied?: { zip: string | null; label: string | null; multiplier: number } | null;
  depart_at?: string;
  depart_is_future?: boolean;
};

function formatMin(s: number) {
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}t ${m % 60}m`;
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("da-DK", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Lille badge der viser om ETA er for nu eller et fremtidigt tidspunkt. */
export function LiveStatusBadge({ info, compact = false }: { info: EtaInfo; compact?: boolean }) {
  const isFuture = !!info.depart_is_future;
  const Icon = isFuture ? CalendarIcon : Clock;
  const text = isFuture
    ? `Planlagt · ${info.depart_at ? formatDateTime(info.depart_at) : ""}`
      : "Aktuel beregning · nu";
  return (
    <Badge
      variant="outline"
      className={`gap-1 ${compact ? "h-5 px-1.5 text-[10px]" : "h-6 px-2 text-xs"} font-medium`}
      style={{
        background: isFuture ? "hsl(38 92% 95%)" : "hsl(142 70% 95%)",
        color: isFuture ? "hsl(28 80% 30%)" : "hsl(142 70% 25%)",
        borderColor: isFuture ? "hsl(38 92% 80%)" : "hsl(142 70% 80%)",
      }}
    >
      {!isFuture && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
      <Icon className="h-3 w-3" />
      <span className="truncate">{text}</span>
    </Badge>
  );
}

/** Toggle mellem rutetjenestens grundtid og vores justerede tid + detaljer. */
export function EtaDetailsButton({
  info,
  showRaw,
  onToggleRaw,
  compact = false,
}: {
  info: EtaInfo;
  showRaw: boolean;
  onToggleRaw: (next: boolean) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const adjusted = info.duration_s ?? null;
  const raw = info.duration_raw_s ?? null;
  const mult = info.traffic_multiplier ?? null;
  const baseMult = info.base_multiplier ?? null;
  const override = info.override_applied;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={compact ? "h-5 w-5" : "h-6 w-6"}
          aria-label="ETA detaljer"
        >
          <Info className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            ETA-beregning
          </p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Grundtid</span>
              <span className="tabular-nums font-medium">{raw != null ? formatMin(raw) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trafik-multiplikator</span>
              <span className="tabular-nums font-medium">
                {mult != null ? `× ${mult.toFixed(2)}` : "—"}
              </span>
            </div>
            <div className="flex justify-between border-t pt-1.5">
              <span className="font-semibold">Korrigeret ETA</span>
              <span className="tabular-nums font-bold">
                {adjusted != null ? formatMin(adjusted) : "—"}
              </span>
            </div>
          </div>
        </div>

        {(baseMult != null || override) && (
          <div className="rounded-md bg-muted/50 p-2 text-xs space-y-1">
            {baseMult != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Basis-buffer (DK)</span>
                <span className="tabular-nums">× {baseMult.toFixed(2)}</span>
              </div>
            )}
            {override && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Område-override
                  {override.zip ? ` (${override.zip})` : ""}
                  {override.label ? ` · ${override.label}` : ""}
                </span>
                <span className="tabular-nums">× {override.multiplier.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-2">
          <label htmlFor="raw-toggle" className="text-xs cursor-pointer">
            Vis grundtid
          </label>
          <Switch id="raw-toggle" checked={showRaw} onCheckedChange={onToggleRaw} />
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight">
          Korrigeret tid bruger en dansk køretidsbuffer. Grundtiden kommer fra
          den nøglefri rutevejledning uden buffer.
        </p>
      </PopoverContent>
    </Popover>
  );
}

/** Returnerer den tid der skal vises baseret på toggle-tilstand. */
export function pickDuration(info: EtaInfo, showRaw: boolean): number | null {
  if (showRaw && info.duration_raw_s != null) return info.duration_raw_s;
  return info.duration_s ?? null;
}