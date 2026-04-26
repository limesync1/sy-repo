// CustomerShell — matcher AdminShell's visuelle sprog 1:1.
// Header, fanebar OG main bruger SAMME container/bredde (fuld bredde med
// konsistent px-4 sm:px-6 padding) — ingen mismatch mellem header og indhold.
// Faner ligger som horisontal nav-bar under topbaren, mobilvenlig med snap-x
// og store trykzoner. Aktiv-fane bruger underline-stil (matcher virksomheds-
// panelets visuelle balance bedre på en topnav uden sidebar).
import { Link } from "react-router-dom";
import type { ReactNode, ComponentType } from "react";
import { LogOut, ChevronDown, Home, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  const { user, signOut } = useAuth();
  const initial = (user?.email || "U").charAt(0).toUpperCase();
  const currentTab = tabs.find((t) => t.key === activeTab);

  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      {/* ── Topbar ── samme h-14 + bg-card som AdminShell */}
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-7" />
          </Link>
          <div className="hidden h-5 w-px bg-border sm:block" />
          <h1 className="hidden text-lg font-semibold text-foreground truncate sm:block">
            {title}
          </h1>

          <div className="ml-auto flex items-center gap-2 min-w-0">
            {topbarRight}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-secondary">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[12px] font-bold text-background">
                    {initial}
                  </div>
                  <span className="hidden max-w-[160px] truncate sm:inline">{user?.email}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/" className="cursor-pointer">
                    <Home className="mr-2 h-4 w-4" /> Til forsiden
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/virksomheder" className="cursor-pointer">
                    <ExternalLink className="mr-2 h-4 w-4" /> Find virksomheder
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Log ud
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Fanebar — i samme container som topbaren = samme bredde */}
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
      </header>

      {/* Mobil sub-header — viser aktiv fanes navn (samme padding som main) */}
      <div className="sm:hidden border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-2.5">
          <h2 className="text-base font-semibold text-foreground">
            {currentTab?.label ?? title}
          </h2>
        </div>
      </div>

      {/* Main — SAMME px-4 sm:px-6 som header → flugter perfekt */}
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
          {children}
        </div>
      </main>
    </div>
  );
};

export default CustomerShell;
