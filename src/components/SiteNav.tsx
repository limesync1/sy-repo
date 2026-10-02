import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SmartLink from "@/components/SmartLink";
import { Menu, X, ChevronDown } from "lucide-react";
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
import customerPanelIcon from "@/assets/header/Kundepanel.png.asset.json";
import businessPanelIcon from "@/assets/header/Virksomhedspanel.png.asset.json";
import employeePanelIcon from "@/assets/header/Medarbejder_app.png.asset.json";
import platformAdminIcon from "@/assets/header/Platform_admin.png.asset.json";
import logoutIcon from "@/assets/header/Log_ud.png.asset.json";
import customerPanelSelected from "@/assets/header/Kundepanel_valgt.webp.asset.json";
import businessPanelSelected from "@/assets/header/Virksomhedspanel_valgt.webp.asset.json";
import employeePanelSelected from "@/assets/header/Medarbejder_app_valgt.webp.asset.json";
import platformAdminSelected from "@/assets/header/Platform_admin_valgt.webp.asset.json";
import customerPanelSelectedAnimated from "@/assets/header/Kundepanel_valgt_animeret.svg";
import businessPanelSelectedAnimated from "@/assets/header/Virksomhedspanel_valgt_animeret.svg";
import employeePanelSelectedAnimated from "@/assets/header/Medarbejder_app_valgt_animeret.svg";
import platformAdminSelectedAnimated from "@/assets/header/Platform_admin_valgt_animeret.svg";

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
  selectedAnimatedIcon: string;
  current: boolean;
};

const PanelIcon = ({ role, selected, size = "md" }: { role: PanelRole; selected: boolean; size?: "md" | "lg" }) => {
  const dimensions = size === "lg" ? "h-9 w-9" : "h-7 w-7";

  if (!selected) {
    return <img src={role.icon} alt="" className={`${dimensions} shrink-0 rounded-lg object-contain`} width={size === "lg" ? 36 : 28} height={size === "lg" ? 36 : 28} />;
  }

  return (
    <span className={`${dimensions} relative inline-flex shrink-0`} aria-hidden="true">
      <img src={role.selectedAnimatedIcon} alt="" className="h-full w-full object-contain motion-reduce:hidden" />
      <img src={role.selectedIcon} alt="" className="hidden h-full w-full object-contain motion-reduce:block" />
    </span>
  );
};

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
    const items: PanelRole[] = [];
    if (!user) return items;

    // Sorteret efter "magt" — det højest privilegerede panel står først
    // og bliver dermed standardvalg ved første login.
    if (userRoles.includes("admin")) {
      items.push({ label: "Platform admin", to: "/admin", icon: platformAdminIcon.url, selectedIcon: platformAdminSelected.url, selectedAnimatedIcon: platformAdminSelectedAnimated, current: pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/platform-admin") });
    }
    if (userRoles.includes("business_owner") || business) {
      items.push({ label: "Virksomhedspanel", to: "/virksomhed", icon: businessPanelIcon.url, selectedIcon: businessPanelSelected.url, selectedAnimatedIcon: businessPanelSelectedAnimated, current: pathname.startsWith("/virksomhed") });
    }
    if (userRoles.includes("employee") || myEmployee) {
      items.push({ label: "Medarbejder-app", to: "/medarbejder", icon: employeePanelIcon.url, selectedIcon: employeePanelSelected.url, selectedAnimatedIcon: employeePanelSelectedAnimated, current: pathname.startsWith("/medarbejder") });
    }
    items.push({ label: "Kundepanel", to: "/min-konto", icon: customerPanelIcon.url, selectedIcon: customerPanelSelected.url, selectedAnimatedIcon: customerPanelSelectedAnimated, current: pathname.startsWith("/min-konto") });

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
              className="h-9 w-auto sm:h-10 lg:h-12"
              width={1920}
              height={539}
              decoding="async"
              fetchPriority="high"
             loading="eager"/>
          </Link>

          {/* Rolig, enkel navigation. Rolleikonerne er forbeholdt panelhandlinger,
              hvor de hjælper brugeren med at genkende den rigtige visning. */}
          <div className="hidden items-center rounded-full border border-border bg-card p-1 shadow-sm lg:flex" aria-label="Hovednavigation">
            {NAV_GROUPS.flatMap((group) => group.items).map((item) => (
              <SmartLink
                key={item.key}
                to={item.to}
                aria-current={isActive(item.key) ? "page" : undefined}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive(item.key)
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
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
                    <div className="hidden sm:inline-flex items-stretch overflow-hidden rounded-full bg-foreground text-background shadow-sm">
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
                               <span className="mr-2"><PanelIcon role={r} selected={preferredRole.to === r.to} size="lg" /></span>{r.label}
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
                      <PanelIcon role={preferredRole} selected />{preferredRole.label}
                    </Button>
                  )
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSignOut}
                  className="hidden rounded-full border-border bg-background text-foreground hover:bg-secondary hover:text-foreground sm:inline-flex"
                >
                  <img src={logoutIcon.url} alt="" className="mr-1.5 h-7 w-7 rounded-md object-contain" width={28} height={28} />Log ud
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden rounded-full px-3 font-semibold lg:inline-flex">
                  <Link to="/log-ind">
                    <img src={customerPanelIcon.url} alt="" className="mr-1.5 h-7 w-7 rounded-md object-contain" width={28} height={28} />
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
              className="h-10 w-10 rounded-full text-foreground lg:hidden"
              aria-label={open ? "Luk menu" : "Åbn menu"}
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {open && (
          <div className="mb-4 rounded-2xl border border-border bg-card p-3 shadow-xl lg:hidden">
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.id} className={gi > 0 ? "mt-2" : ""}>
                {gi > 0 && <div className="mb-2 h-px bg-border" />}
                <div className="flex items-center gap-2 px-3 pt-2 pb-1.5">
                  <div className="h-1 w-1 rounded-full bg-accent" aria-hidden="true" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    {group.label}
                  </p>
                </div>
                {group.items.map((item) => (
                  <SmartLink
                    key={item.key}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive(item.key) ? "bg-foreground text-background" : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    {item.label}
                  </SmartLink>
                ))}
              </div>
            ))}
            <div className="my-2 h-px bg-border" />
            {user ? (
              <>
                {showSwitcher && (
                  <>
                    <div className="flex items-center gap-2 px-3 pt-2 pb-1.5">
                      <div className="h-1 w-1 rounded-full bg-accent" aria-hidden="true" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Skift visning</p>
                    </div>
                    {roles.map((r) => (
                      <Button
                        type="button"
                        variant="ghost"
                        key={r.to}
                        onClick={() => { handleSelectPanel(r.to); setOpen(false); navigate(r.to); }}
                        className={`h-auto w-full justify-start gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${
                          preferredRole?.to === r.to ? "bg-foreground text-background" : "text-foreground hover:bg-secondary"
                        }`}
                      >
                       <PanelIcon role={r} selected={preferredRole?.to === r.to} size="lg" />{r.label}
                      </Button>
                    ))}
                    <div className="my-2 h-px bg-border" />
                  </>
                )}
                {preferredRole && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setOpen(false); navigate(preferredRole.to); }}
                    className="h-auto w-full justify-start gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
                  >
                     <PanelIcon role={preferredRole} selected size="lg" />Gå til {preferredRole.label}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setOpen(false); handleSignOut(); }}
                  className="h-auto w-full justify-start gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
                >
                  <img src={logoutIcon.url} alt="" className="h-9 w-9 rounded-lg object-contain" width={36} height={36} />Log ud
                </Button>
              </>
            ) : (
              <>
                <Link to="/log-ind" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary">
                  <img src={customerPanelIcon.url} alt="" className="h-9 w-9 rounded-lg object-contain" width={36} height={36} />
                  Log ind
                </Link>
                <Link to="/log-ind?signup=1" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary">
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
