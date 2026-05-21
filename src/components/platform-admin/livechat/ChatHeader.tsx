import { Download, BellOff, Bell, Archive } from "lucide-react";
import type { Conversation } from "./shared";
import { initials } from "./shared";

type Props = {
  active: Conversation;
  snoozed: boolean;
  showInfo: boolean;
  onToggleInfo: () => void;
  onExport: () => void;
  onSnooze: (hours: number) => void;
  onUnsnooze: () => void;
  onClose: () => void;
  onReopen: () => void;
};

/** Header-bjælke over chat-tråden — handlinger + status-pille. */
export default function ChatHeader({
  active, snoozed, showInfo, onToggleInfo, onExport, onSnooze, onUnsnooze, onClose, onReopen,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-[12px] font-semibold text-background">
          {initials(active.visitor_name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{active.visitor_name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{active.subject || "Ingen emne"}</p>
        </div>
        <span
          className={`ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            active.status === "closed"
              ? "bg-muted text-muted-foreground"
              : "bg-success/10 text-success"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${active.status === "closed" ? "bg-muted-foreground" : "bg-success animate-pulse"}`} />
          {active.status === "closed" ? "Afsluttet" : "Åben"}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleInfo}
          className="hidden rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary lg:block"
        >
          {showInfo ? "Skjul info" : "Vis info"}
        </button>
        <button
          onClick={onExport}
          className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary"
          title="Eksportér samtale som .txt"
        >
          <Download className="mr-1 inline h-3 w-3" /> Eksport
        </button>
        {snoozed ? (
          <button
            onClick={onUnsnooze}
            className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary"
            title="Fjern snooze"
          >
            <Bell className="mr-1 inline h-3 w-3" /> Unsnooze
          </button>
        ) : active.status !== "closed" ? (
          <div className="relative group">
            <button
              className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary"
              title="Snooze samtalen"
            >
              <BellOff className="mr-1 inline h-3 w-3" /> Snooze
            </button>
            <div className="invisible absolute right-0 top-full z-10 mt-1 flex flex-col rounded-lg border border-border bg-card shadow-lg opacity-0 transition-all group-hover:visible group-hover:opacity-100">
              {[1, 2, 4, 8, 24].map((h) => (
                <button
                  key={h}
                  onClick={() => onSnooze(h)}
                  className="whitespace-nowrap px-3 py-1.5 text-left text-[11px] text-foreground hover:bg-secondary"
                >
                  {h < 24 ? `${h} time${h > 1 ? "r" : ""}` : "1 dag"}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {active.status !== "closed" ? (
          <button onClick={onClose} className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary">
            <Archive className="mr-1 inline h-3 w-3" /> Afslut
          </button>
        ) : (
          <button onClick={onReopen} className="rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary">
            Genåbn
          </button>
        )}
      </div>
    </div>
  );
}