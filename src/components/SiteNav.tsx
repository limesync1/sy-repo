import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SmartLink from "@/components/SmartLink";
import { Menu, X, LogOut, ChevronDown, User, Briefcase, ShieldCheck, Truck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBusiness } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Props {
  active?: "search" | "quote" | "business" | null;
  right?: React.ReactNode;
}

const NAV_ITEMS: { key: NonNullable<Props["active"]>; label: string; to: string }[] = [
  { key: "search", label: "Find services", to: "/virksomheder" },
  { key: "quote", label: "Få tilbud", to: "/tilbud" },
  { key: "business", label: "Bliv udbyder", to: "/opret-virksomhed" },
];

const PANEL_PREFERENCE_KEY = "preferred-panel-route";

const SiteNav = ({ active, right }: Props) => {
  const [open, setOpen] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: business } = useMyBusiness();

  const { data: userRoles = [] } = useQuery({
    queryKey: ["user-roles", user?.id],
    enabled: !!user?.id,
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

    items.push({ label: "Kundepanel", to: "/min-konto", icon: User, current: pathname.startsWith("/min-konto") });
    if (userRoles.includes("business_owner") || business) {
      items.push({ label: "Virksomhedspanel", to: "/virksomhed", icon: Briefcase, current: pathname.startsWith("/virksomhed") });
    }
    if (userRoles.includes("employee")) {
      items.push({ label: "Medarbejder-app", to: "/medarbejder", icon: Truck, current: pathname.startsWith("/medarbejder") });
    }
    if (userRoles.includes("admin")) {
      items.push({ label: "Platform admin", to: "/platform-admin", icon: ShieldCheck, current: pathname.startsWith("/platform-admin") });
    }

    return items;
  }, [business, pathname, user, userRoles]);

  const showSwitcher = roles.length > 1;
  const currentRole = roles.find((r) => r.current) || roles[0];
  const preferredRole = roles.find((role) => role.to === selectedPanel) || currentRole || roles[0] || null;

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

    if (currentRole?.to) {
      setSelectedPanel(currentRole.to);
    }
  }, [currentRole?.to, roles, user]);

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
              alt="Serviceydere"
              className="h-8 sm:h-9 md:h-10 w-auto"
              width={1920}
              height={539}
              decoding="async"
              fetchPriority="high"
             loading="eager"/>
          </Link>

          {/* Primær nav — vises fra md+ så tablet ikke ender med tom "Menu"-chip.
              På små tablet (<lg) bruger vi en mere kompakt padding så alle 3
              links plus højre-side knapper kan være på linjen. */}
          <div className="hidden items-center gap-1 rounded-full border border-border/70 bg-card/80 p-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <SmartLink
                key={item.key}
                to={item.to}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors lg:px-4 lg:py-2 ${
                  isActive(item.key)
                    ? "bg-secondary text-foreground shadow-sm"
                    : "text-foreground/80 hover:bg-secondary hover:text-foreground"
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
                  <button className="rounded-full px-3 sm:px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary active:bg-secondary/70">
                    Log ind
                  </button>
                </Link>
                <Link to="/log-ind?signup=1" className="hidden sm:inline-block">
                  <button className="rounded-full bg-foreground px-3 sm:px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 active:bg-foreground/80">
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
            {NAV_ITEMS.map((item) => (
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
