// AdminBottomNav — sticky bottom navigation for the business panel on
// mobile/tablet (<lg). Mirrors the pattern used in EmployeeShell so users
// get a familiar native-app feel. Shows the 4 most important destinations
// + a "Mere"-knap that opens the full sidebar-drawer for the rest.
import { LayoutDashboard, ShoppingCart, Contact, Route as RouteIcon, Menu, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminTabKey } from "./AdminShell";

type Item = { key: AdminTabKey; label: string; icon: any };

type Props = {
  activeTab: AdminTabKey;
  routePlanningEnabled: boolean;
  onSelect: (key: AdminTabKey) => void;
  onOpenMenu: () => void;
};

export default function AdminBottomNav({ activeTab, routePlanningEnabled, onSelect, onOpenMenu }: Props) {
  const primary: Item[] = [
    { key: "dashboard", label: "Overblik", icon: LayoutDashboard },
    { key: "orders", label: "Aftaler", icon: ShoppingCart },
    routePlanningEnabled
      ? { key: "routes", label: "Ruter", icon: RouteIcon }
      : { key: "services", label: "Services", icon: Wrench },
    { key: "customers", label: "Kunder", icon: Contact },
  ];

  return (
    <nav
      className="service-panel-bottomnav fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
      aria-label="Hurtig navigation"
    >
      <ul className="grid grid-cols-5">
        {primary.map((it) => {
          const Icon = it.icon;
          const active = activeTab === it.key;
          return (
            <li key={it.key}>
              <button
                type="button"
                onClick={() => onSelect(it.key)}
                className={cn(
                    "relative flex min-h-[58px] w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active
                      ? "text-accent"
                    : "text-muted-foreground hover:text-foreground active:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-[5px]", active && "bg-accent/10 text-accent")}><Icon className="h-5 w-5" /></span>
                <span className="leading-tight">{it.label}</span>
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onOpenMenu}
            className="flex min-h-[58px] w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground active:text-foreground"
            aria-label="Åbn fuld menu"
          >
            <span className="flex h-7 w-12 items-center justify-center rounded-[5px]"><Menu className="h-5 w-5" /></span>
            <span className="leading-tight">Mere</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}