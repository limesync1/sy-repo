// PanelBottomNav — fælles bundnavigation til mobil/tablet (<lg).
// - Op til 4 primære destinationer + en "Mere"-knap der åbner et bottom sheet
//   med resten (og valgfrit et footer-område til fx Log ud).
// - "Mere" markeres som aktiv når den aktive fane ligger inde i sheet'et.
// - Højden er 60px + safe-area og matcher --bottomnav-h i PanelShell.
import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type BottomNavItem = {
  key: string;
  label: string;
  icon: any;
  active: boolean;
  onSelect: () => void;
  onPrefetch?: () => void;
  /** Tal/tekst → pille i sheet, dot i bundnav. */
  badge?: number | string | null;
  badgeWarn?: boolean;
};

type Props = {
  primary: BottomNavItem[];
  more?: BottomNavItem[];
  moreTitle?: string;
  /** Vises under grid'et i "Mere"-sheet'et (fx Se din side / Log ud). */
  moreFooter?: ReactNode;
};

const hasBadge = (b: BottomNavItem["badge"]) => b !== null && b !== undefined && b !== 0 && b !== "";

export default function PanelBottomNav({ primary, more = [], moreTitle = "Mere", moreFooter }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const hasMore = more.length > 0 || !!moreFooter;
  const moreActive = more.some((i) => i.active);
  const columns = primary.length + (hasMore ? 1 : 0);

  const itemClass = (active: boolean) =>
    cn(
      "relative flex h-[60px] w-full touch-manipulation flex-col items-center justify-center gap-0.5 text-[11px] font-medium outline-none",
      "transition-colors motion-reduce:transition-none focus-visible:bg-secondary/60",
      active ? "text-accent" : "text-muted-foreground active:text-foreground",
    );

  const pill = (active: boolean) =>
    cn(
      "relative flex h-7 w-12 items-center justify-center rounded-full transition-[background-color,transform] duration-200 motion-reduce:transition-none",
      active ? "bg-accent/10" : "bg-transparent",
    );

  return (
    <>
      <nav
        className="service-panel-bottomnav fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Hurtig navigation"
      >
        <ul
          className="mx-auto grid max-w-lg"
          style={{ gridTemplateColumns: `repeat(${Math.max(columns, 1)}, minmax(0, 1fr))` }}
        >
          {primary.map((it) => {
            const Icon = it.icon;
            return (
              <li key={it.key}>
                <button
                  type="button"
                  onClick={it.onSelect}
                  onTouchStart={it.onPrefetch}
                  onMouseEnter={it.onPrefetch}
                  className={itemClass(it.active)}
                  aria-current={it.active ? "page" : undefined}
                >
                  <span className={pill(it.active)}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {hasBadge(it.badge) && (
                      <span
                        className={cn("absolute right-2 top-0.5 h-2 w-2 rounded-full ring-2 ring-card", it.badgeWarn ? "bg-destructive" : "bg-accent")}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span className="leading-tight">{it.label}</span>
                </button>
              </li>
            );
          })}
          {hasMore && (
            <li>
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className={itemClass(moreActive)}
                aria-haspopup="dialog"
                aria-label="Åbn flere menupunkter"
              >
                <span className={pill(moreActive)}>
                  <Menu className="h-5 w-5" aria-hidden="true" />
                  {more.some((i) => hasBadge(i.badge)) && (
                    <span className="absolute right-2 top-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-card" aria-hidden="true" />
                  )}
                </span>
                <span className="leading-tight">{moreTitle}</span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      {hasMore && (
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent
            side="bottom"
            hideCloseButton
            className="max-h-[82dvh] gap-0 overflow-y-auto rounded-t-2xl border-border/60 bg-card p-0 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-lg lg:hidden"
          >
            <SheetTitle className="sr-only">{moreTitle}</SheetTitle>
            <SheetDescription className="sr-only">Flere menupunkter</SheetDescription>
            <div className="flex justify-center py-2.5" aria-hidden="true">
              <span className="h-1 w-10 rounded-full bg-muted-foreground/25" />
            </div>

            {more.length > 0 && (
              <ul className="grid grid-cols-3 gap-1 px-3 pb-2">
                {more.map((it) => {
                  const Icon = it.icon;
                  return (
                    <li key={it.key}>
                      <button
                        type="button"
                        onClick={() => { setMoreOpen(false); it.onSelect(); }}
                        onTouchStart={it.onPrefetch}
                        aria-current={it.active ? "page" : undefined}
                        className={cn(
                          "relative flex w-full touch-manipulation flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-xs font-medium outline-none transition-colors motion-reduce:transition-none",
                          "focus-visible:ring-2 focus-visible:ring-accent/60 active:bg-secondary",
                          it.active ? "bg-accent/10 text-accent" : "text-foreground hover:bg-secondary/60",
                        )}
                      >
                        <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", it.active ? "bg-card" : "bg-secondary")}>
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="max-w-full truncate leading-tight">{it.label}</span>
                        {hasBadge(it.badge) && (
                          <span
                            className={cn(
                              "absolute right-2 top-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                              it.badgeWarn ? "bg-destructive text-destructive-foreground" : "bg-foreground/10 text-foreground",
                            )}
                          >
                            {it.badge}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {moreFooter ? <div className="mt-1 space-y-1 border-t border-border/60 px-3 pt-3">{moreFooter}</div> : null}
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
