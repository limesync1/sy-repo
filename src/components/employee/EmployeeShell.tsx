// EmployeeShell — slank, mobil-først shell til medarbejder-app'en.
//
// Med kun 2–3 navigationspunkter er et fuldt sidepanel overkill. I stedet
// bruger vi:
//   • En sticky topbar (logo + sidetitel + profilmenu) på ALLE størrelser.
//   • Horisontale tabs i topbaren på desktop (lg+).
//   • En bundnavigation på mobil/tablet (<lg) — tomlevenligt, native-app-
//     agtigt, og frigør den fulde skærmbredde til indhold.
//
// Brug:
//   <EmployeeShell activeTab="today" title="Min dag" topbarRight={...}>
//     <indhold />
//   </EmployeeShell>
import { Link, useNavigate } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import {
  LogOut, Calendar as CalendarIcon, BarChart3, MessageCircle, Briefcase,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyEmployee } from "@/hooks/useMyEmployee";
import { useMyBusiness } from "@/hooks/useDatabase";
import { useEmployees } from "@/hooks/useEmployees";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmployeeTabKey = "today" | "stats" | "livechat";

type NavItem = {
  value: EmployeeTabKey;
  label: string;
  icon: any;
  href: string;
  /** Hvis sat, vises kun når medarbejderen har dette flag i sin record. */
  requiresEmployeeFlag?: "livechat_enabled";
};

const NAV_ITEMS: NavItem[] = [
  { value: "today", label: "Min dag", icon: CalendarIcon, href: "/medarbejder" },
  { value: "stats", label: "Statistik", icon: BarChart3, href: "/medarbejder/statistik" },
  { value: "livechat", label: "Livechat", icon: MessageCircle, href: "/medarbejder/livechat", requiresEmployeeFlag: "livechat_enabled" },
];

// Prefetch — start download af den anden side når brugeren hover'er nav-knappen.
// Medarbejder-app'en har kun to ruter, men prefetch gør skiftet øjeblikkeligt.
const TAB_PREFETCH: Record<string, () => Promise<unknown>> = {
  today: () => import("@/pages/EmployeeApp"),
  stats: () => import("@/pages/EmployeeStats"),
  livechat: () => import("@/pages/EmployeeLivechat"),
};
const prefetched = new Set<string>();
const prefetchTab = (key: string) => {
  if (prefetched.has(key)) return;
  prefetched.add(key);
  TAB_PREFETCH[key]?.().catch(() => prefetched.delete(key));
};

type EmployeeShellProps = {
  /** Aktiv fane — fremhæves i sidebar. */
  activeTab: EmployeeTabKey;
  /** Tekst i topbar. */
  title?: ReactNode;
  /** Indhold i højre side af topbar (knapper, badges osv.). */
  topbarRight?: ReactNode;
  /** Sat til false hvis siden selv styrer padding. */
  contentPadding?: boolean;
  /** Ekstra klasser på <main>. */
  contentClassName?: string;
  children: ReactNode;
};

export const EmployeeShell = ({
  activeTab, title, topbarRight,
  contentPadding = true, contentClassName, children,
}: EmployeeShellProps) => {
  const { user, signOut } = useAuth();
  const { data: employee } = useMyEmployee();
  // Hvis medarbejderen også ejer virksomheden (typisk solo-ejeren), så
  // vises "Skift til virksomhedspanel" i profilmenuen.
  const { data: myBusiness } = useMyBusiness();
  // Sole-employee detection — når virksomheden har præcis 1 aktiv medarbejder
  // og det er ejeren selv, viser vi en synlig genvej i topbaren (samme idé
  // som "Skift til medarbejder" i AdminShell's footer). Det gør hop frem og
  // tilbage til ét klik i stedet for to via profilmenuen.
  const { data: businessEmployees } = useEmployees(myBusiness?.id);
  const isSoloOwner =
    !!myBusiness &&
    !!employee &&
    Array.isArray(businessEmployees) &&
    businessEmployees.length === 1 &&
    businessEmployees[0]?.id === employee.id;
  const navigate = useNavigate();

  // Idle-prefetch ALLE medarbejderfaner kort efter mount, så Suspense aldrig
  // viser fallback ved fane-skift — kun den enkelte tabs interne data-load.
  // Fjerner følelsen af "siden loader to gange".
  useEffect(() => {
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    const trigger = () => Object.keys(TAB_PREFETCH).forEach((k) => prefetchTab(k));
    const id = ric ? ric(trigger, { timeout: 4000 }) : window.setTimeout(trigger, 2000);
    return () => {
      if (ric && (window as any).cancelIdleCallback) (window as any).cancelIdleCallback(id);
      else window.clearTimeout(id as number);
    };
  }, []);

  // Hent virksomhedens egen livechat-indstilling — medarbejderen må kun se
  // livechat-fanen hvis BÅDE virksomheden har funktionen aktiveret OG
  // medarbejderen har fået adgang individuelt.
  const { data: businessLivechatEnabled } = useQuery({
    queryKey: ["business-livechat-enabled", employee?.business_id],
    enabled: !!employee?.business_id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("businesses")
        .select("settings")
        .eq("id", employee!.business_id)
        .maybeSingle();
      return !!(data?.settings as any)?.livechat_enabled;
    },
  });

  const visibleNav = NAV_ITEMS.filter((n) => {
    if (!n.requiresEmployeeFlag) return true;
    if (n.requiresEmployeeFlag === "livechat_enabled") {
      return !!(employee as any)?.livechat_enabled && !!businessLivechatEnabled;
    }
    return !!(employee as any)?.[n.requiresEmployeeFlag];
  });
  const currentNav = NAV_ITEMS.find((n) => n.value === activeTab);
  const displayName =
    employee?.name ||
    (user?.user_metadata?.display_name as string | undefined) ||
    user?.email ||
    "Medarbejder";
  const subLabel = employee?.title || user?.email || "Medarbejder";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("") || "M";
  const accentColor = employee?.color || "hsl(var(--foreground))";

  return (
    <div className="isolate flex min-h-dvh flex-col bg-secondary/50">
      {/* Topbar — altid synlig */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-5">
          <Link to="/" className="flex shrink-0 items-center" aria-label="Forside">
            <img
              src="/serviceydere-logo-dark.webp"
              alt="Serviceydere"
              className="h-7 w-auto sm:h-8"
              width={1920}
              height={539}
              decoding="async"
              fetchPriority="high"
              loading="lazy"
            />
          </Link>

          {/* Desktop nav — horisontale tabs */}
          <nav className="ml-2 hidden items-center gap-1 lg:flex" aria-label="Hovednavigation">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => navigate(item.href)}
                  onMouseEnter={() => prefetchTab(item.value)}
                  onFocus={() => prefetchTab(item.value)}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Mobile/tablet sidetitel */}
          <h1 className="truncate text-base font-semibold text-foreground sm:text-lg lg:hidden">
            {title ?? currentNav?.label}
          </h1>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            {topbarRight}

            {/* Solo-ejer genvej — kun synlig når virksomheden har præcis
                1 medarbejder og det er ejeren selv. Spejler "Skift til
                medarbejder"-knappen i AdminShell's footer. */}
            {isSoloOwner && (
              <button
                type="button"
                onClick={() => navigate("/virksomhed")}
                className="hidden h-8 shrink-0 items-center gap-2 rounded-md pl-1 pr-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary sm:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
                aria-label="Skift til virksomhedspanel"
              >
                <span
                  aria-hidden="true"
                  className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundImage:
                      "conic-gradient(from 0deg, #ef4444, #f59e0b, #84cc16, #06b6d4, #6366f1, #d946ef, #ef4444)",
                    padding: "2px",
                  }}
                >
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-card">
                    <Briefcase className="h-3 w-3 text-foreground" />
                  </span>
                </span>
                <span className="hidden md:inline">Virksomhedspanel</span>
                <span className="md:hidden">Virksomhed</span>
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex shrink-0 items-center gap-2 rounded-full p-0.5 pl-0.5 pr-2 transition-colors hover:bg-secondary"
                  aria-label="Profilmenu"
                >
                  <Avatar className="h-8 w-8 rounded-full ring-2 ring-border" style={{ background: accentColor }}>
                    {employee?.avatar_url ? (
                      <AvatarImage src={employee.avatar_url} alt={displayName} className="rounded-full object-cover" />
                    ) : null}
                    <AvatarFallback
                      className="rounded-full text-background text-xs font-bold"
                      style={{ background: accentColor }}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[140px] truncate text-sm font-medium text-foreground sm:inline">
                    {displayName}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">{subLabel}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {myBusiness && (
                  <DropdownMenuItem onClick={() => navigate("/virksomhed")}>
                    <Briefcase className="mr-2 h-4 w-4" />
                    Skift til virksomhedspanel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log ud
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main — får ekstra bund-padding på mobil/tablet for at gøre plads til bottom-nav */}
      <main
        className={cn(
          "relative z-0 flex-1 min-w-0",
          contentPadding ? "p-2.5 sm:p-4 md:p-6" : "",
          // 64px bottom-nav + safe-area på mobil/tablet.
          visibleNav.length > 1 ? "pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0" : "",
          contentClassName,
        )}
      >
        {children}
      </main>

      {/* Bundnavigation — kun mobil/tablet, kun hvis vi har mere end ét punkt */}
      {visibleNav.length > 1 && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          aria-label="Bundnavigation"
        >
          <ul className="mx-auto flex max-w-md items-stretch justify-around">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.value;
              return (
                <li key={item.value} className="flex-1">
                  <button
                    type="button"
                    onClick={() => navigate(item.href)}
                    onTouchStart={() => prefetchTab(item.value)}
                    className={cn(
                      "flex w-full flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                        active ? "bg-secondary" : "bg-transparent",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="leading-tight">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
};

export default EmployeeShell;