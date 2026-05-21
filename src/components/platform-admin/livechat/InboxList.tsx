import { RefObject } from "react";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";
import { Inbox, Search, Volume2, VolumeX, ArrowUpDown, MessageCircle, BellOff, CheckCircle2 } from "lucide-react";
import type { Conversation, Filter, SortMode } from "./shared";
import { initials } from "./shared";

type Props = {
  searchRef: RefObject<HTMLInputElement>;
  search: string;
  onSearch: (v: string) => void;
  filter: Filter;
  onFilter: (f: Filter) => void;
  sortMode: SortMode;
  onSortMode: (s: SortMode) => void;
  filtered: Conversation[];
  conversations: Conversation[];
  totalUnread: number;
  snoozedCount: number;
  snoozes: Record<string, string>;
  activeId: string | null;
  onSelect: (id: string) => void;
  muted: boolean;
  onToggleMute: () => void;
};

/**
 * Venstre indbakke-panel. Ren præsentation — al state styres i orkestratoren
 * så filter/sort/snooze-logik kan deles mellem nye delkomponenter.
 */
export default function InboxList({
  searchRef, search, onSearch,
  filter, onFilter, sortMode, onSortMode,
  filtered, conversations, totalUnread, snoozedCount, snoozes,
  activeId, onSelect, muted, onToggleMute,
}: Props) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Indbakke</h2>
            {totalUnread > 0 && (
              <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                {totalUnread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleMute}
              title={muted ? "Slå lyd til" : "Slå lyd fra"}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            <span className="text-[11px] text-muted-foreground">{filtered.length}/{conversations.length}</span>
          </div>
        </div>
        <div className="relative mt-2.5">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            value={search} onChange={(e) => onSearch(e.target.value)}
            placeholder="Søg navn, email, emne, besked… (tryk /)"
            className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-2.5 text-xs text-foreground outline-none focus:border-foreground"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {(["all", "unread", "open", "closed", "snoozed"] as Filter[]).map((f) => {
            const label =
              f === "all" ? "Alle" :
              f === "unread" ? "Ulæst" :
              f === "open" ? "Åbne" :
              f === "closed" ? "Lukket" :
              `Snoozed${snoozedCount ? ` (${snoozedCount})` : ""}`;
            return (
              <button
                key={f} onClick={() => onFilter(f)}
                className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  filter === f ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sortér</span>
          <select
            value={sortMode}
            onChange={(e) => onSortMode(e.target.value as SortMode)}
            className="ml-auto rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none focus:border-foreground"
          >
            <option value="recent">Seneste aktivitet</option>
            <option value="unread_first">Ulæste først</option>
            <option value="oldest">Ældste først</option>
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Ingen samtaler her.</p>
            <p className="text-[10px] text-muted-foreground/70">Tip: tryk <kbd className="rounded bg-secondary px-1">/</kbd> for at søge, <kbd className="rounded bg-secondary px-1">j/k</kbd> for navigation</p>
          </div>
        )}
        {filtered.map((c) => {
          const isActive = c.id === activeId;
          const isUnread = c.unread_admin_count > 0;
          return (
            <button
              key={c.id} onClick={() => onSelect(c.id)}
              className={`flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left transition-colors ${
                isActive ? "bg-secondary" : "hover:bg-secondary/60"
              }`}
            >
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                isUnread ? "bg-foreground text-background" : "bg-secondary text-foreground border border-border"
              }`}>
                {initials(c.visitor_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate text-[13px] ${isUnread ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                    {c.visitor_name}
                  </span>
                  <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.last_message_at), { locale: da, addSuffix: false })}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{c.subject || c.visitor_email}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {c.user_id && <span className="rounded bg-success/10 px-1.5 py-0.5 text-[9px] font-medium text-success">Logget ind</span>}
                  {c.needs_human && (
                    <span className="rounded bg-accent px-1.5 py-0.5 text-[9px] font-bold text-accent-foreground">
                      🙋 Vil tale med menneske
                    </span>
                  )}
                  {snoozes[c.id] && (
                    <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground" title={`Snoozed indtil ${new Date(snoozes[c.id]).toLocaleString("da-DK")}`}>
                      <BellOff className="h-2.5 w-2.5" /> Snoozed
                    </span>
                  )}
                  {c.status === "closed" && (
                    <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Lukket
                    </span>
                  )}
                  {isUnread && (
                    <span className="ml-auto flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">
                      {c.unread_admin_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}