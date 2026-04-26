// CustomerShell — matcher AdminShell's visuelle sprog (kompakt h-14 topbar,
// bg-secondary/50 baggrund, samme typografi og fane-stil), men UDEN sidepanel.
// Faner ligger som en horisontal nav-bar lige under topbaren, med samme
// rounded-lg + bg-secondary aktiv-stil som sidebar-items i AdminShell.
// Mobilvenlig: store trykzoner (min-h-44px), horisontal scroll med snap-x.
import { Link } from "react-router-dom";
import type { ReactNode, ComponentType } from "react";
import { LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
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
  const currentTab = tabs.find((t) => t.key === activeTab);

  return (
    <div className="flex min-h-screen flex-col bg-secondary/50">
      {/* Topbar — matcher AdminShell: h-14, bg-card, samme typografi */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-7" />
        </Link>
        <div className="hidden h-5 w-px bg-border sm:block" />
        <h1 className="hidden text-lg font-semibold text-foreground truncate sm:block">
          {title}
        </h1>

        <div className="ml-auto flex items-center gap-2 min-w-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-secondary">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
                  {initial}
                </div>
                <span className="hidden max-w-[160px] truncate sm:inline">{user?.email}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground truncate">
                {user?.email}
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" /> Log ud
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Sub-header (mobil): viser aktiv fanes navn — ligesom AdminShell topbar */}
      <div className="sm:hidden border-b border-border bg-card px-4 py-2.5">
        <h2 className="text-base font-semibold text-foreground">
          {currentTab?.label ?? title}
        </h2>
      </div>

      {/* Fanebar — matcher AdminShell sidebar-items i visuel stil */}
      <nav
        className="sticky top-14 z-30 border-b border-border bg-card"
        aria-label="Kundepanel sektioner"
      >
        <div className="mx-auto max-w-6xl px-2 sm:px-4">
          <div
            className="flex gap-1 overflow-x-auto scroll-smooth snap-x py-2 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
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
                    "snap-start shrink-0 inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px] whitespace-nowrap",
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