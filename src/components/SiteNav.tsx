import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, ChevronDown, User, Briefcase, ShieldCheck, Truck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useMyBusiness } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Props {
  active?: "search" | "quote" | "business" | null;
  right?: React.ReactNode;
}

const NAV_ITEMS: { key: NonNullable<Props["active"]>; label: string; to: string }[] = [
  { key: "search", label: "Find services", to: "/virksomheder" },
  { key: "quote", label: "Få tilbud", to: "/tilbud" },
  { key: "business", label: "Bliv udbyder", to: "/log-ind?mode=business" },
];

const SiteNav = ({ active, right }: Props) => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { data: business } = useMyBusiness();

  // Detect employee role
  const { data: isEmployee } = useQuery({
    queryKey: ["is-employee", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles").select("role").eq("user_id", user!.id).eq("role", "employee").maybeSingle();
      return !!data;
    },
  });

  const roles: { label: string; to: string; icon: React.ComponentType<any>; current: boolean }[] = [];
  if (user) {
    roles.push({ label: "Kundepanel", to: "/min-konto", icon: User, current: pathname.startsWith("/min-konto") });
    if (business) roles.push({ label: "Virksomhedspanel", to: "/virksomhed", icon: Briefcase, current: pathname.startsWith("/virksomhed") });
    if (isEmployee) roles.push({ label: "Medarbejder-app", to: "/medarbejder", icon: Truck, current: pathname.startsWith("/medarbejder") });
    if (isAdmin) roles.push({ label: "Platform admin", to: "/platform-admin", icon: ShieldCheck, current: pathname.startsWith("/platform-admin") });
  }
  const showSwitcher = roles.length > 1;
  const currentRole = roles.find((r) => r.current) || roles[0];

  const isActive = (key: NonNullable<Props["active"]>) => {
    if (active !== undefined) return active === key;
    if (key === "search") return pathname.startsWith("/virksomheder") || pathname.startsWith("/search");
    if (key === "quote") return pathname.startsWith("/tilbud") || pathname.startsWith("/quote");
    return false;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 py-3 sm:py-3.5">
          <Link to="/" className="flex shrink-0 items-center" aria-label="Serviceydere forside">
            <img src="/serviceydere-logo-dark.png" alt="Serviceydere" className="h-8 sm:h-9 md:h-10" />
          </Link>

          <div className="hidden items-center gap-1 rounded-full border border-border/70 bg-card/80 p-1 lg:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive(item.key)
                    ? "bg-secondary text-foreground shadow-sm"
                    : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex lg:hidden items-center rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
            {NAV_ITEMS.find((item) => isActive(item.key))?.label || "Menu"}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {right}

            {/* Logged-in: role switcher OR avatar dropdown */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
                    {currentRole?.icon && <currentRole.icon className="h-4 w-4 text-muted-foreground" />}
                    <span className="max-w-[140px] truncate">{currentRole?.label || "Min konto"}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {showSwitcher && (
                    <>
                      <DropdownMenuLabel className="text-xs text-muted-foreground">Skift visning</DropdownMenuLabel>
                      {roles.map((r) => (
                        <DropdownMenuItem key={r.to} onClick={() => navigate(r.to)} className={r.current ? "bg-secondary" : ""}>
                          <r.icon className="h-4 w-4 mr-2" />{r.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />Log ud
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
              <Link
                key={item.key}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive(item.key) ? "bg-secondary text-foreground" : "text-foreground hover:bg-secondary"
                }`}
              >
                {item.label}
              </Link>
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
                        onClick={() => { setOpen(false); navigate(r.to); }}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
                          r.current ? "bg-secondary text-foreground" : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        <r.icon className="h-4 w-4" />{r.label}
                      </button>
                    ))}
                  </>
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
