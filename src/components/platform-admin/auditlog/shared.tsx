import { cn } from "@/lib/utils";

export const ACTION_LABELS: Record<string, string> = {
  extend_trial: "Forlænget prøveperiode",
  reset_trial: "Nulstillet prøveperiode",
  end_trial_now: "Afsluttet prøveperiode nu",
  force_active: "Markeret som betalende",
  transfer_owner: "Overdraget ejer",
  soft_delete: "Arkiveret (soft-delete)",
  restore: "Gendannet",
  hard_delete: "Slettet permanent",
  set_role: "Ændret rolle",
  suspend_user: "Suspenderet bruger",
  delete_user: "Slettet bruger",
  impersonate: "Logget ind som bruger",
};

export type GroupMode = "none" | "day" | "admin" | "target";
export const PAGE_SIZE = 100;
export const WATCH_KEY = "admin-audit-watch";
export const SAVED_KEY = "admin-audit-saved-filters";

export type SavedFilter = {
  name: string;
  q: string;
  actionFilter: string;
  adminFilter: string;
  rangeFilter: string;
  groupMode: GroupMode;
  watchOnly: boolean;
};

export function loadWatch(): string[] {
  try { return JSON.parse(localStorage.getItem(WATCH_KEY) || "[]"); } catch { return []; }
}
export function loadSaved(): SavedFilter[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch { return []; }
}

export const DATE_RANGES: { value: string; label: string; days: number | null }[] = [
  { value: "24h", label: "Sidste 24 timer", days: 1 },
  { value: "7d", label: "Sidste 7 dage", days: 7 },
  { value: "30d", label: "Sidste 30 dage", days: 30 },
  { value: "all", label: "Alle", days: null },
];

export function toCsv(rows: any[]): string {
  const header = ["created_at", "admin_email", "action", "target_type", "target_label", "details"];
  const esc = (v: any) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header.join(","), ...rows.map((r) => header.map((h) => esc(r[h])).join(","))].join("\n");
}

export function renderDiff(before: any, after: any) {
  const keys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));
  return (
    <div className="rounded-md border border-border bg-background overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr_1fr] text-[11px] font-semibold bg-secondary/60 px-3 py-1.5 border-b border-border">
        <span>Felt</span><span>Før</span><span>Efter</span>
      </div>
      {keys.map((k) => {
        const b = before?.[k]; const a = after?.[k];
        const changed = JSON.stringify(b) !== JSON.stringify(a);
        return (
          <div key={k} className={cn("grid grid-cols-[1fr_1fr_1fr] gap-2 px-3 py-1.5 text-[11px] border-b border-border last:border-b-0", changed && "bg-amber-50 dark:bg-amber-950/20")}>
            <span className="font-mono text-muted-foreground truncate">{k}</span>
            <span className="font-mono text-foreground/80 truncate">{b == null ? "—" : typeof b === "object" ? JSON.stringify(b) : String(b)}</span>
            <span className="font-mono text-foreground truncate">{a == null ? "—" : typeof a === "object" ? JSON.stringify(a) : String(a)}</span>
          </div>
        );
      })}
    </div>
  );
}