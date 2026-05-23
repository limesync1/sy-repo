// AdminCommandPalette — global Cmd+K søgning på tværs af virksomheder, brugere
// og admin-handlinger. Åbnes med Cmd/Ctrl+K eller af topbar-knappen.
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import {
  Building2, Users, ShoppingCart, Star, MessageCircle, Globe,
  History, Settings, LayoutDashboard, Repeat, ExternalLink, HeartPulse, Mail,
} from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelectTab: (tab: string) => void;
  /** Sorteret liste af senest besøgte tab-keys — vises øverst som genvej. */
  recentTabs?: string[];
};

const TABS = [
  { value: "overview", label: "Gå til Overblik", icon: LayoutDashboard },
  { value: "businesses", label: "Gå til Virksomheder", icon: Building2 },
  { value: "users", label: "Gå til Brugere", icon: Users },
  { value: "orders", label: "Gå til Ordrer", icon: ShoppingCart },
  { value: "subscriptions", label: "Gå til Abonnementer", icon: Repeat },
  { value: "reviews", label: "Gå til Anmeldelser", icon: Star },
  { value: "livechat", label: "Gå til Livechat", icon: MessageCircle },
  { value: "domains", label: "Gå til Domæner", icon: Globe },
  { value: "audit", label: "Gå til Aktivitetslog", icon: History },
  { value: "health", label: "Gå til Sundhed", icon: HeartPulse },
  { value: "mails", label: "Gå til Mails", icon: Mail },
  { value: "settings", label: "Gå til Platform-indstillinger", icon: Settings },
];

export default function AdminCommandPalette({ open, onOpenChange, onSelectTab, recentTabs }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  // Cmd/Ctrl+K → toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Henter top-resultater når palette er åben. Begrænset til 8 pr. type.
  const { data: businesses } = useQuery({
    queryKey: ["cmdk-businesses", query],
    enabled: open,
    queryFn: async () => {
      const term = query.trim();
      let q = supabase.from("businesses").select("id,name,slug,city").limit(8);
      if (term) q = q.ilike("name", `%${term}%`);
      const { data } = await q;
      return data || [];
    },
  });

  const close = (fn: () => void) => { onOpenChange(false); fn(); };

  // Vis kun senest-besøgt når brugeren ikke har skrevet noget — så søgning
  // dominerer fuldstændigt over historik når der filtreres.
  const recents = (recentTabs || [])
    .slice(0, 4)
    .map((v) => TABS.find((t) => t.value === v))
    .filter((t): t is (typeof TABS)[number] => !!t);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Søg virksomheder, faner, handlinger…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>Ingen resultater.</CommandEmpty>

        {!query && recents.length > 0 && (
          <>
            <CommandGroup heading="Senest besøgt">
              {recents.map((t) => (
                <CommandItem
                  key={`recent-${t.value}`}
                  value={`recent-${t.value}-${t.label}`}
                  onSelect={() => close(() => onSelectTab(t.value))}
                >
                  <t.icon className="mr-2 h-4 w-4" />
                  {t.label.replace(/^Gå til /, "")}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {businesses && businesses.length > 0 && (
          <CommandGroup heading="Virksomheder">
            {businesses.map((b) => (
              <CommandItem key={b.id} value={`biz-${b.id}-${b.name}`}
                onSelect={() => close(() => { onSelectTab("businesses"); navigate(`/admin#biz-${b.id}`); })}>
                <Building2 className="mr-2 h-4 w-4" />
                <span className="flex-1">{b.name}</span>
                {b.city && <span className="text-xs text-muted-foreground">{b.city}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />
        <CommandGroup heading="Faner">
          {TABS.map((t) => (
            <CommandItem key={t.value} value={`tab-${t.value}-${t.label}`}
              onSelect={() => close(() => onSelectTab(t.value))}>
              <t.icon className="mr-2 h-4 w-4" />
              {t.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Hurtige links">
          <CommandItem value="link-home" onSelect={() => close(() => window.open("/", "_blank"))}>
            <ExternalLink className="mr-2 h-4 w-4" /> Åbn forside (ny fane)
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}