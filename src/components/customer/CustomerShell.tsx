// CustomerShell — top-bar shell der matcher AdminShell's visuelle sprog
// (samme baggrund, samme topbar-højde, samme typografi), men UDEN sidepanel.
// Faner ligger som en horisontal nav-bar lige under topbaren — matcher
// stil-tokens fra AdminShell's sidebar-nav (rounded-lg, bg-secondary aktiv,
// muted-foreground inaktiv).
import { Link } from "react-router-dom";
import type { ReactNode, ComponentType } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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
  activeTab, onTabChange, tabs, title = "Kundepanel", children,
}: CustomerShellProps) => {
  const { user, signOut } = useAuth();
  const initial = (user?.email || "U").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      {/* Topbar — samme h-14, samme bg-card, samme border som AdminShell */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-5 sm:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-7" />
        </Link>
        <div className="hidden h-5 w-px bg-border sm:block" />
        <h1 className="hidden text-lg font-semibold text-foreground truncate sm:block">{title}</h1>

        <div className="ml-auto flex items-center gap-2 min-w-0">
          <div className="hidden items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 sm:flex">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
              {initial}
            </div>
            <span className="max-w-[180px] truncate text-sm text-foreground">{user?.email}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log ud</span>
          </Button>
        </div>
      </header>

      {/* Tab-nav under topbaren — horisontal version af AdminShell-sidebar-items */}
      <nav className="sticky top-14 z-20 border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto py-2 -mx-1 px-1">
            {tabs.map((tab) => {
              const isActive = tab.key === activeTab;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => onTabChange(tab.key)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-secondary text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
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

      {/* Content — samme padding som AdminShell main */}
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-6xl p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default CustomerShell;