// CustomerShell — bruger den globale SiteNav øverst (samme header som forsiden),
// så kundepanelet føles som en naturlig forlængelse af resten af sitet.
// Under SiteNav vises en fanebar i samme max-w-7xl container, så bredden
// flugter 1:1 med forsiden og resten af sektionerne.
import type { ReactNode, ComponentType } from "react";
import SiteNav from "@/components/SiteNav";
import { cn } from "@/lib/utils";

export type CustomerTab = {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Valgfri badge (fx antal nye forslag) */
  badge?: number;
};

type CustomerShellProps = {
  activeTab: string;
  onTabChange: (key: string) => void;
  tabs: CustomerTab[];
  title?: ReactNode;
  /** Indhold i højre side af topbar (fx CTA-knap). */
  topbarRight?: ReactNode;
  children: ReactNode;
};

export const CustomerShell = ({
  activeTab, onTabChange, tabs, title = "Kundepanel", topbarRight, children,
}: CustomerShellProps) => {
  const currentTab = tabs.find((t) => t.key === activeTab);

  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      {/* ── Global header ── samme SiteNav som forsiden bruger */}
      <SiteNav right={topbarRight} />

      {/* Fanebar — i samme max-w-7xl container = præcis samme bredde som forsiden */}
      <div className="border-b border-border bg-card/95 backdrop-blur">
        <nav aria-label="Kundepanel sektioner" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className="-mb-px flex gap-1 overflow-x-auto scroll-smooth snap-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
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
                    "snap-start shrink-0 inline-flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors min-h-[48px] whitespace-nowrap border-b-2",
                    isActive
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {tab.label}
                  {typeof tab.badge === "number" && tab.badge > 0 && (
                    <span className={cn(
                      "ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                      isActive
                        ? "bg-foreground text-background"
                        : "bg-secondary text-foreground",
                    )}>
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Mobil sub-header — viser aktiv fanes navn */}
      <div className="sm:hidden border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-2.5">
          <h2 className="text-base font-semibold text-foreground">
            {currentTab?.label ?? title}
          </h2>
        </div>
      </div>

      {/* Main — SAMME px-4 sm:px-6 som header → flugter perfekt med forsiden */}
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
          {children}
        </div>
      </main>
    </div>
  );
};

export default CustomerShell;
