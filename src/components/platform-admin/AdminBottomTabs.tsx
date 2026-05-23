import { LayoutDashboard, Building2, Users, ShoppingCart, MessageCircle, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobil-only bottom-tab bar for de hyppigst brugte admin-faner.
 * Vises kun under sm-breakpoint og fungerer sammen med sidebar-menuen
 * ("Mere" åbner sidebar). Holder hænderne tæt på tommelfingeren.
 *
 * Aktiv tab får en tydelig pille omkring ikonet + accent-streg over —
 * giver bedre touch-target affordance end ren tekstfarve.
 */
const ITEMS = [
  { value: "overview", label: "Overblik", icon: LayoutDashboard },
  { value: "businesses", label: "Virks.", icon: Building2 },
  { value: "users", label: "Brugere", icon: Users },
  { value: "orders", label: "Ordrer", icon: ShoppingCart },
  { value: "livechat", label: "Chat", icon: MessageCircle },
];

export default function AdminBottomTabs({
  tab,
  onSelectTab,
  onOpenMore,
}: {
  tab: string;
  onSelectTab: (t: string) => void;
  onOpenMore: () => void;
}) {
  // Match "Mere"-tab når den valgte tab ikke er én af de fem primære.
  const inMore = !ITEMS.some((i) => i.value === tab);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-[60px] items-stretch border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 pb-[env(safe-area-inset-bottom)] sm:hidden"
      aria-label="Admin hurtignavigation"
    >
      {ITEMS.map((item) => {
        const active = tab === item.value;
        return (
          <button
            key={item.value}
            onClick={() => onSelectTab(item.value)}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground active:text-foreground",
            )}
            aria-current={active ? "page" : undefined}
            aria-label={item.label}
          >
            {active && (
              <span aria-hidden="true" className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-foreground" />
            )}
            <span
              className={cn(
                "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                active ? "bg-secondary" : "bg-transparent",
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
            </span>
            <span className="leading-none">{item.label}</span>
          </button>
        );
      })}
      <button
        onClick={onOpenMore}
        className={cn(
          "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
          inMore ? "text-foreground" : "text-muted-foreground active:text-foreground",
        )}
        aria-label="Vis flere faner"
      >
        {inMore && (
          <span aria-hidden="true" className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-foreground" />
        )}
        <span
          className={cn(
            "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
            inMore ? "bg-secondary" : "bg-transparent",
          )}
        >
          <MoreHorizontal className="h-[18px] w-[18px]" />
        </span>
        <span className="leading-none">Mere</span>
      </button>
    </nav>
  );
}