import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SmartLink from "@/components/SmartLink";
import { usePersistentPublicNavigation } from "./PublicNavigation";
import BetaNotice from "./BetaNotice";
import { Menu, X, ChevronDown, Search, FileText, Store, LayoutGrid, ChevronRight, LogIn, LogOut, UserPlus } from "lucide-react";
const MOBILE_ICONS = { search: Search, quote: FileText, business: Store, software: LayoutGrid } as const;
import { useAuth } from "@/contexts/AuthContext";
import { useMyBusiness } from "@/hooks/useDatabase";
import { useMyEmployee } from "@/hooks/useMyEmployee";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import customerPanelIcon from "@/assets/header-simple/Kundepanel_simpel.svg.asset.json";
import businessPanelIcon from "@/assets/header-simple/Virksomhedspanel_simpel.svg.asset.json";
import employeePanelIcon from "@/assets/header-simple/Medarbejder_app_simpel.svg.asset.json";
import platformAdminIcon from "@/assets/header-simple/Platform_admin_simpel.svg.asset.json";
import logoutIcon from "@/assets/header-simple/Log_ud_simpel.svg.asset.json";
import loginIcon from "@/assets/header-simple/Log_ind_simpel.svg.asset.json";

interface Props {
  persistent?: boolean;
  active?: "search" | "quote" | "business" | "software" | null;
  right?: React.ReactNode;
}

type NavItem = { key: NonNullable<Props["active"]>; label: string; to: string };

/** Navigationen er delt i to publikummer, så både brugere, skærmlæsere og
 *  sprogmodeller kan se hvad der er til kunder og hvad der er til virksomheder. */
const NAV_GROUPS: { id: "customers" | "business"; label: string; items: NavItem[] }[] = [
  {
    id: "customers",
    label: "For kunder",
    items: [
      { key: "search", label: "Find services", to: "/virksomheder" },
      { key: "quote", label: "Få tilbud", to: "/tilbud" },
    ],
  },
  {
    id: "business",
    label: "For virksomheder",
    items: [
      { key: "business", label: "Bliv udbyder", to: "/opret-virksomhed" },
      { key: "software", label: "Systemet", to: "/software" },
    ],
  },
];

const PANEL_PREFERENCE_KEY = "preferred-panel-route";

type PanelRole = {
  label: string;
  to: string;
  icon: string;
  selectedIcon: string;
  current: boolean;
};

const PanelIcon = ({ role, selected, size = "md" }: { role: PanelRole; selected: boolean; size?: "md" | "lg" }) => {
  const dimensions = size === "lg" ? "h-9 w-9" : "h-7 w-7";
  return (
    <span className={`${dimensions} flex shrink-0 items-center justify-center rounded-lg ${selected ? "bg-background/12" : "bg-secondary"}`}>
      <img
        src={role.icon}
        alt=""
        className={`${size === "lg" ? "h-5 w-5" : "h-4 w-4"} object-contain ${selected ? "brightness-0 invert" : "opacity-75"}`}
        width={size === "lg" ? 20 : 16}
        height={size === "lg" ? 20 : 16}
      />
    </span>
  );
};

const SiteNav = ({ active, right, persistent = false }: Props) => {
  const hasPersistentNavigation = usePersistentPublicNavigation();
  const [open, setOpen] = useState(false);
  // Læs præference synkront ved første render — så panel-knappen aldrig
  // "popper" fra tom → admin når brugeren navigerer mellem sider.
  const [selectedPanel, setSelectedPanel] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(PANEL_PREFERENCE_KEY);
  });
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: business } = useMyBusiness();
  // Fallback: hvis user_roles endnu ikke er opdateret efter at virksomheds-
  // ejeren har oprettet sig selv som første medarbejder, kan vi stadig
  // detektere medarbejder-adgangen via employees-tabellen.
  const { data: myEmployee } = useMyEmployee();

  const { data: userRoles = [] } = useQuery({
    queryKey: ["user-roles", user?.id],
    enabled: !!user?.id,
    // Roller skifter sjældent — hold dem cached så header ikke
    // refetcher (og blinker) ved hver sidenavigation.
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data || []).map((entry) => entry.role);
    },
  });

  const roles = useMemo(() => {
    const items: PanelRole[] = [];
    if (!user) return items;

    // Sorteret efter "magt" — det højest privilegerede panel står først
    // og bliver dermed standardvalg ved første login.
    if (userRoles.includes("admin")) {
      items.push({ label: "Platform admin", to: "/admin", icon: platformAdminIcon.url, selectedIcon: platformAdminIcon.url, current: pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/platform-admin") });
    }
    if (userRoles.includes("business_owner") || business) {
      items.push({ label: "Virksomhedspanel", to: "/virksomhed", icon: businessPanelIcon.url, selectedIcon: businessPanelIcon.url, current: pathname.startsWith("/virksomhed") });
    }
    if (userRoles.includes("employee") || myEmployee) {
      items.push({ label: "Medarbejder-app", to: "/medarbejder", icon: employeePanelIcon.url, selectedIcon: employeePanelIcon.url, current: pathname.startsWith("/medarbejder") });
    }
    items.push({ label: "Kundepanel", to: "/min-konto", icon: customerPanelIcon.url, selectedIcon: customerPanelIcon.url, current: pathname.startsWith("/min-konto") });

    return items;
  }, [business, myEmployee, pathname, user, userRoles]);

  const showSwitcher = roles.length > 1;
  // Højest-magt panel er altid det første i listen (admin > business > employee > kunde).
  const highestRole = roles[0] || null;
  const currentRole = roles.find((r) => r.current) || highestRole;
  const preferredRole = roles.find((role) => role.to === selectedPanel) || highestRole || null;

  useEffect(() => {
    if (!user) {
      setSelectedPanel(null);
      return;
    }

    const stored = typeof window !== "undefined" ? window.localStorage.getItem(PANEL_PREFERENCE_KEY) : null;
    if (stored && roles.some((role) => role.to === stored)) {
      setSelectedPanel(stored);
      return;
    }

    // Ingen gemt præference → vælg det højest privilegerede panel
    // brugeren har adgang til (admin > virksomhed > medarbejder > kunde).
    if (highestRole?.to) {
      setSelectedPanel(highestRole.to);
    }
  }, [highestRole?.to, roles, user]);

  const handleSelectPanel = (to: string) => {
    setSelectedPanel(to);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PANEL_PREFERENCE_KEY, to);
    }
  };

  const isActive = (key: NonNullable<Props["active"]>) => {
    if (active !== undefined) return active === key;
    if (key === "search") return pathname.startsWith("/virksomheder") || pathname.startsWith("/search");
    if (key === "quote") return pathname.startsWith("/tilbud") || pathname.startsWith("/quote");
    if (key === "business") return pathname.startsWith("/opret-virksomhed");
    if (key === "software") return pathname === "/software" || pathname.startsWith("/software/");
    return false;
  };

  const handleSignOut = async () => {
    await signOut();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PANEL_PREFERENCE_KEY);
    }
    navigate("/");
  };

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);
  if (hasPersistentNavigation && !persistent) return null;

  return (
    <header className="site-nav-light sticky top-0 z-40 bg-site-header-background" data-public-navigation>
    <BetaNotice />
    <nav aria-label="Serviceydere navigation" className="border-b border-border bg-site-header-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-14 items-center justify-between gap-2 py-2 lg:py-3.5">
          <Link to="/" className="flex shrink-0 items-center" aria-label="Serviceydere forside">
            <img
              src="/serviceydere-logo-dark.webp"
            alt="Serviceydere – find og book lokale serviceydere i Danmark"
              className="h-8 w-auto sm:h-9 lg:h-12"
              width={1920}
              height={539}
              decoding="async"
              fetchPriority="high"
             loading="eager"/>
          </Link>

          {/* Rolig, enkel navigation. Rolleikonerne er forbeholdt panelhandlinger,
              hvor de hjælper brugeren med at genkende den rigtige visning. */}
          <div className="hidden items-center rounded-full border border-border bg-card p-1 shadow-sm lg:flex" role="navigation" aria-label="Hovednavigation">
            {NAV_GROUPS.flatMap((group) => group.items).map((item) => (
              <SmartLink
                key={item.key}
                to={item.to}
                aria-current={isActive(item.key) ? "page" : undefined}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive(item.key)
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-secondary"
                }`}
              >
                {item.label}
              </SmartLink>
            ))}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {right}

            {user ? (
              <>
                {preferredRole && (
                  showSwitcher ? (
                    <div className="hidden lg:inline-flex items-stretch overflow-hidden rounded-full bg-foreground text-background shadow-sm">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate(preferredRole.to)}
                        className="h-auto rounded-none px-3.5 py-2 text-sm font-semibold text-background hover:bg-foreground/90 hover:text-background"
                        title={`Gå til ${preferredRole.label}`}
                      >
                        <PanelIcon role={preferredRole} selected />
                        <span className="max-w-[160px] truncate">{preferredRole.label}</span>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-auto rounded-none border-l border-background/20 px-2 text-background hover:bg-foreground/90 hover:text-background"
                            aria-label="Skift panel"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel className="text-xs text-muted-foreground">Skift panel</DropdownMenuLabel>
                          {roles.map((r) => (
                            <DropdownMenuItem
                              key={r.to}
                              onClick={() => { handleSelectPanel(r.to); navigate(r.to); }}
                              className={preferredRole.to === r.to ? "bg-secondary" : ""}
                            >
                               <span className="mr-2"><PanelIcon role={r} selected={false} size="lg" /></span>{r.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => navigate(preferredRole.to)}
                      className="hidden rounded-full bg-foreground font-semibold text-background hover:bg-foreground/90 lg:inline-flex"
                    >
                      <PanelIcon role={preferredRole} selected />{preferredRole.label}
                    </Button>
                  )
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSignOut}
                  className="hidden rounded-full border-border bg-background text-foreground hover:bg-secondary hover:text-foreground lg:inline-flex"
                >
                  <span className="mr-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-secondary"><img src={logoutIcon.url} alt="" className="h-4 w-4 object-contain opacity-75" width={16} height={16} /></span>Log ud
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden rounded-full px-3 font-semibold lg:inline-flex">
                  <Link to="/log-ind">
                    <span className="mr-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-secondary"><img src={loginIcon.url} alt="" className="h-4 w-4 object-contain opacity-75" width={16} height={16} /></span>
                    Log ind
                  </Link>
                </Button>
                <Button asChild size="sm" className="hidden rounded-full bg-foreground px-3 font-semibold text-background shadow-sm hover:bg-foreground/90 lg:inline-flex">
                  <Link to="/log-ind?signup=1">
                    Opret konto
                  </Link>
                </Button>
              </>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOpen((v) => !v)}
              className="h-11 w-11 rounded-md border border-transparent text-foreground hover:border-border hover:bg-secondary active:bg-secondary focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
              aria-label={open ? "Luk menu" : "Åbn menu"}
              aria-expanded={open}
              aria-controls="public-mobile-menu"
            >
              <span className="relative h-5 w-5">
                <Menu className={`absolute inset-0 h-5 w-5 transition-all duration-200 ${open ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
                <X className={`absolute inset-0 h-5 w-5 transition-all duration-200 ${open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`} />
              </span>
            </Button>
          </div>
        </div>

        <div
          id="public-mobile-menu"
          role="region"
          aria-label="Mobilmenu"
          aria-hidden={!open}
          {...(!open ? ({ inert: "" } as Record<string, string>) : {})}
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none lg:hidden ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
        >
          <div className="overflow-hidden">
            <div className={`pb-3 transition-transform duration-300 ease-out motion-reduce:transition-none ${open ? "translate-y-0" : "-translate-y-2"}`}>
              <div className="grid grid-cols-2 gap-2">
                {NAV_GROUPS.flatMap((g) => g.items).map((item, i) => {
                  const on = isActive(item.key);
                  return (
                    <SmartLink
                      key={item.key}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      aria-current={on ? "page" : undefined}
                      style={{ transitionDelay: open ? `${60 + i * 40}ms` : "0ms" }}
                      className={`flex min-h-14 flex-col justify-center rounded-lg border px-2.5 py-2 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${open ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"} ${
                        on ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:border-accent/40 active:scale-[0.98] active:bg-secondary"
                      }`}
                    >
                      {(() => { const Icon = MOBILE_ICONS[item.key]; return (
                        <span className="flex items-center gap-2.5">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${on ? "bg-background/15" : "bg-accent/10 text-accent"}`}><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
                          <span className="min-w-0">
                            <span className={`block text-[11px] font-semibold leading-tight ${on ? "text-background/70" : "text-muted-foreground"}`}>{i < 2 ? "For kunder" : "For virksomheder"}</span>
                            <span className="block truncate text-sm font-bold leading-tight">{item.label}</span>
                          </span>
                        </span>
                      ); })()}
                    </SmartLink>
                  );
                })}
              </div>
              {user ? (
                <div className="mt-2 rounded-lg border border-border bg-card p-2">
                  <div className="flex items-center gap-2.5 px-1 pb-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold uppercase text-background" aria-hidden="true">
                      {(user.email || "?").charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-semibold leading-tight text-muted-foreground">Logget ind som</span>
                      <span className="block truncate text-sm font-bold leading-tight text-foreground">{user.email}</span>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {preferredRole && (
                      <Button type="button" onClick={() => { setOpen(false); navigate(preferredRole.to); }} className="min-h-11 flex-1 gap-2 rounded-lg bg-foreground font-semibold text-background hover:bg-foreground/90">
                        <img src={preferredRole.icon} alt="" className="h-4 w-4 object-contain brightness-0 invert" width={16} height={16} />
                        <span className="truncate">{preferredRole.label}</span><ChevronRight className="ml-auto h-4 w-4 opacity-70" aria-hidden="true" />
                      </Button>
                    )}
                    <Button type="button" variant="outline" onClick={() => { setOpen(false); handleSignOut(); }} className="min-h-11 gap-1.5 rounded-lg border-destructive/30 font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <LogOut className="h-4 w-4" aria-hidden="true" />Log ud
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <Button asChild variant="outline" className="min-h-12 flex-1 gap-2 rounded-lg border-foreground/20 font-semibold">
                    <Link to="/log-ind" onClick={() => setOpen(false)}><LogIn className="h-4 w-4" aria-hidden="true" />Log ind</Link>
                  </Button>
                  <Button asChild className="min-h-12 flex-1 gap-2 rounded-lg bg-foreground font-semibold text-background hover:bg-foreground/90">
                    <Link to="/log-ind?signup=1" onClick={() => setOpen(false)}><UserPlus className="h-4 w-4" aria-hidden="true" />Opret konto</Link>
                  </Button>
                </div>
              )}
              {user && showSwitcher && (
                <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5" aria-label="Skift visning">
                  {roles.filter((r) => r.to !== preferredRole?.to).map((r) => (
                    <button
                      key={r.to}
                      type="button"
                      onClick={() => { handleSelectPanel(r.to); setOpen(false); navigate(r.to); }}
                      className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground active:bg-secondary"
                    >
                      <img src={r.icon} alt="" className="h-4 w-4 object-contain opacity-75" width={16} height={16} />
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
    <button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      onClick={() => setOpen(false)}
      className={`fixed inset-x-0 bottom-0 top-0 -z-10 bg-foreground/40 transition-opacity duration-300 motion-reduce:transition-none lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
    />
    </header>
  );
};

export default SiteNav;
