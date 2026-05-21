import { LayoutDashboard, Building2, Users, ShoppingCart, MessageCircle, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobil-only bottom-tab bar for de hyppigst brugte admin-faner.
 * Vises kun under sm-breakpoint og fungerer sammen med sidebar-menuen
 * ("Mere" åbner sidebar). Holder hænderne tæt på tommelfingeren.
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
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:hidden"
      aria-label="Admin hurtignavigation"
    >
      {ITEMS.map((item) => {
        const active = tab === item.value;
        return (
          <button
            key={item.value}
            onClick={() => onSelectTab(item.value)}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
              active ? "text-accent" : "text-muted-foreground",
            )}
            aria-current={active ? "page" : undefined}
            aria-label={item.label}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        );
      })}
      <button
        onClick={onOpenMore}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground transition-colors"
        aria-label="Vis flere faner"
      >
        <MoreHorizontal className="h-5 w-5" />
        <span>Mere</span>
      </button>
    </nav>
  );
}