// CustomerShell — bruger samme SiteNav som forsiden i toppen, og lægger
// en mobilvenlig horisontal fanebar lige under. Fanebaren har store trykzoner
// (h-11 / py-2.5), horisontal scroll på små skærme og snap-stop på hver fane.
import type { ReactNode, ComponentType } from "react";
import SiteNav from "@/components/SiteNav";
import { cn } from "@/lib/utils";

export type CustomerTab = {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type CustomerShellProps = {
  /** Aktiv fane-key — fremhæves i nav. */
  activeTab: string;
  onTabChange: (key: string) => void;
  tabs: CustomerTab[];
  /** Topbar-titel (default: "Kundepanel"). */
  title?: ReactNode;
  children: ReactNode;
};

export const CustomerShell = ({
  activeTab, onTabChange, tabs, title: _title, children,
}: CustomerShellProps) => {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      {/* Samme header som forsiden */}
      <SiteNav active={null} />

      {/* Fanebar — sticky under SiteNav, mobilvenlig (scroll-snap, store trykzoner) */}
      <nav
        className="sticky top-[57px] z-30 border-b border-border bg-background/95 backdrop-blur-md sm:top-[61px]"
        aria-label="Kundepanel sektioner"
      >
        <div className="mx-auto max-w-6xl px-2 sm:px-6">
          <div
            className="flex gap-1.5 overflow-x-auto scroll-smooth snap-x snap-mandatory py-2 px-1 sm:gap-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
          >
            {tabs.map((tab) => {
              const isActive = tab.key === activeTab;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onTabChange(tab.key)}
                  className={cn(
                    "snap-start shrink-0 inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px] whitespace-nowrap",
                    isActive
                      ? "border-foreground bg-foreground text-background shadow-sm"
                      : "border-border bg-card text-foreground hover:bg-secondary",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-6xl p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default CustomerShell;