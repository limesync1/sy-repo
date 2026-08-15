import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SmartLink from "@/components/SmartLink";
import { Menu, X, LogOut, ChevronDown, User, Briefcase, ShieldCheck, Truck } from "lucide-react";
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

interface Props {
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
      { key: "software", label: "Software", to: "/software" },
    ],
  },
];

const PANEL_PREFERENCE_KEY = "preferred-panel-route";

const SiteNav = ({ active, right }: Props) => {
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
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []).map((entry) => entry.role);
    },
  });

  const roles = useMemo(() => {
    const items: { label: string; to: string; icon: React.ComponentType<any>; current: boolean }[] = [];
    if (!user) return items;

    // Sorteret efter "magt" — det højest privilegerede panel står først
    // og bliver dermed standardvalg ved første login.
    if (userRoles.includes("admin")) {
      items.push({ label: "Platform admin", to: "/admin", icon: ShieldCheck, current: pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/platform-admin") });
    }
    if (userRoles.includes("business_owner") || business) {
      items.push({ label: "Virksomhedspanel", to: "/virksomhed", icon: Briefcase, current: pathname.startsWith("/virksomhed") });
    }
    if (userRoles.includes("employee") || myEmployee) {
      items.push({ label: "Medarbejder-app", to: "/medarbejder", icon: Truck, current: pathname.startsWith("/medarbejder") });
    }
    items.push({ label: "Kundepanel", to: "/min-konto", icon: User, current: pathname.startsWith("/min-konto") });

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

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 py-3 sm:py-3.5">
          <Link to="/" className="flex shrink-0 items-center" aria-label="Serviceydere forside">
            <img
              src="/serviceydere-logo-dark.webp"
            alt="Serviceydere – find og book lokale serviceydere i Danmark"
              className="h-9 sm:h-10 md:h-12 w-auto"
              width={1920}
              height={539}
              decoding="async"
              fetchPriority="high"
             loading="eager"/>
          </Link>

          {/* Primær nav — opdelt i to tydelige sektioner med små labels ovenover,
              så både kunder og virksomheder med det samme kan se hvad der er for dem. */}
          <div className="hidden items-center gap-3 md:flex lg:gap-4">
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.id} className="flex items-center gap-3 lg:gap-4">
                <div className="flex flex-col items-start gap-1.5" role="group" aria-label={group.label}>
                  <span className="px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    {group.label}
                  </span>
                  <div className="flex items-center gap-1 rounded-full border border-border/50 bg-muted/50 p-1 shadow-sm">
                    {group.items.map((item) => (
                      <SmartLink
                        key={item.key}
                        to={item.to}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all lg:px-4 lg:py-2 ${
                          isActive(item.key)
                            ? "bg-foreground text-background shadow-sm hover:bg-foreground/90"
                            : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        {item.label}
                      </SmartLink>
                    ))}
                  </div>
                </div>
                {gi === 0 && (
                  <div className="hidden h-8 w-px self-end bg-border/70 lg:block" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {right}

            {user ? (
              <>
                {preferredRole && (
                  showSwitcher ? (
                    <div className="hidden sm:inline-flex items-stretch overflow-hidden rounded-full bg-foreground text-background shadow-sm">
                      <button
                        onClick={() => navigate(preferredRole.to)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-foreground/90"
                        title={`Gå til ${preferredRole.label}`}
                      >
                        <preferredRole.icon className="h-4 w-4" />
                        <span className="max-w-[160px] truncate">{preferredRole.label}</span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="inline-flex items-center border-l border-background/20 px-2 transition-colors hover:bg-foreground/90"
                            aria-label="Skift panel"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel className="text-xs text-muted-foreground">Skift panel</DropdownMenuLabel>
                          {roles.map((r) => (
                            <DropdownMenuItem
                              key={r.to}
                              onClick={() => { handleSelectPanel(r.to); navigate(r.to); }}
                              className={preferredRole.to === r.to ? "bg-secondary" : ""}
                            >
                              <r.icon className="mr-2 h-4 w-4" />{r.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => navigate(preferredRole.to)}
                      className="hidden rounded-full bg-foreground font-semibold text-background hover:bg-foreground/90 sm:inline-flex"
                    >
                      <preferredRole.icon className="mr-1.5 h-4 w-4" />{preferredRole.label}
                    </Button>
                  )
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSignOut}
                  className="hidden rounded-full border-border bg-background text-foreground hover:bg-secondary hover:text-foreground sm:inline-flex"
                >
                  <LogOut className="mr-1.5 h-4 w-4" />Log ud
                </Button>
              </>
            ) : (
              <>
                <Link to="/log-ind" className="hidden md:inline-block">
                  <button className="rounded-full px-3 sm:px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95">
                    Log ind
                  </button>
                </Link>
                <Link to="/log-ind?signup=1" className="hidden sm:inline-block">
                  <button className="rounded-full bg-foreground px-3 sm:px-4 py-2 text-sm font-semibold text-background shadow-sm transition-all hover:bg-foreground/90 hover:shadow active:scale-95">
                    Opret konto
                  </button>
                </Link>
              </>
            )}

            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary md:hidden"
              aria-label={open ? "Luk menu" : "Åbn menu"}
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="mb-3 rounded-2xl border border-border bg-card p-2 shadow-lg md:hidden">
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.id}>
                {gi > 0 && <div className="my-1 h-px bg-border" />}
                <p className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                {group.items.map((item) => (
                  <SmartLink
                    key={item.key}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive(item.key) ? "bg-secondary text-foreground" : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    {item.label}
                  </SmartLink>
                ))}
              </div>
            ))}
            <div className="my-1 h-px bg-border" />
            {user ? (
              <>
                {showSwitcher && (
                  <>
                    <p className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Skift visning</p>
                    {roles.map((r) => (
                      <button
                        key={r.to}
                        onClick={() => { handleSelectPanel(r.to); setOpen(false); navigate(r.to); }}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
                          preferredRole?.to === r.to ? "bg-secondary text-foreground" : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        <r.icon className="h-4 w-4" />{r.label}
                      </button>
                    ))}
                    <div className="my-1 h-px bg-border" />
                  </>
                )}
                {preferredRole && (
                  <button
                    onClick={() => { setOpen(false); navigate(preferredRole.to); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
                  >
                    <preferredRole.icon className="h-4 w-4" />Gå til {preferredRole.label}
                  </button>
                )}
                <button
                  onClick={() => { setOpen(false); handleSignOut(); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  <LogOut className="h-4 w-4" />Log ud
                </button>
              </>
            ) : (
              <>
                <Link to="/log-ind" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary">
                  Log ind
                </Link>
                <Link to="/log-ind?signup=1" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary">
                  Opret konto
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default SiteNav;
