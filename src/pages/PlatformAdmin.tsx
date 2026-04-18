import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Navigate, Link } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, Building2, Users, ShoppingCart, Star,
  LogOut, Menu, X, ShieldCheck, Repeat,
} from "lucide-react";
import SEO from "@/components/SEO";
import PlatformOverviewTab from "@/components/platform-admin/PlatformOverviewTab";
import PlatformBusinessesTab from "@/components/platform-admin/PlatformBusinessesTab";
import PlatformUsersTab from "@/components/platform-admin/PlatformUsersTab";
import PlatformOrdersTab from "@/components/platform-admin/PlatformOrdersTab";
import PlatformSubscriptionsTab from "@/components/platform-admin/PlatformSubscriptionsTab";
import PlatformReviewsTab from "@/components/platform-admin/PlatformReviewsTab";

const NAV = [
  { value: "overview", label: "Overblik", icon: LayoutDashboard },
  { value: "businesses", label: "Virksomheder", icon: Building2 },
  { value: "users", label: "Brugere", icon: Users },
  { value: "orders", label: "Ordrer", icon: ShoppingCart },
  { value: "subscriptions", label: "Abonnementer", icon: Repeat },
  { value: "reviews", label: "Anmeldelser", icon: Star },
];

const PlatformAdmin = () => {
  const { user, loading, signOut } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const [tab, setTab] = useState("overview");
  const [open, setOpen] = useState(false);

  if (loading || roleLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Indlæser...</div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const current = NAV.find((n) => n.value === tab);

  return (
    <div className="flex min-h-screen bg-secondary/50">
      <SEO title="Platform Admin · Serviceydere" description="Administrér virksomheder, brugere og ordrer på Serviceydere." noIndex />

      {open && <div className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col bg-foreground transition-transform duration-200 lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-14 shrink-0 items-center justify-between px-3">
          <Link to="/" className="flex items-center gap-2 text-white">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <span className="text-sm font-semibold">Platform Admin</span>
          </Link>
          <button onClick={() => setOpen(false)} className="rounded-md p-1 text-white/50 hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-px px-2 overflow-y-auto">
          {NAV.map((item) => {
            const active = tab === item.value;
            return (
              <button
                key={item.value}
                onClick={() => { setTab(item.value); setOpen(false); }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-white/[0.12] text-white" : "text-white/55 hover:bg-white/[0.06] hover:text-white/90"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/[0.06] px-2 py-2 space-y-px">
          <Link to="/admin" className="flex w-full items-center gap-2 rounded-lg px-2 py-[7px] text-sm font-medium text-white/55 hover:bg-white/[0.06] hover:text-white/90">
            <Building2 className="h-4 w-4 shrink-0" /> Min virksomhed
          </Link>
          <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-2 py-[7px] text-sm font-medium text-white/55 hover:bg-red-500/20 hover:text-red-400">
            <LogOut className="h-4 w-4 shrink-0" /> Log ud
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-5 sm:px-6">
          <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{current?.label}</h1>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          {tab === "overview" && <PlatformOverviewTab />}
          {tab === "businesses" && <PlatformBusinessesTab />}
          {tab === "users" && <PlatformUsersTab />}
          {tab === "orders" && <PlatformOrdersTab />}
          {tab === "subscriptions" && <PlatformSubscriptionsTab />}
          {tab === "reviews" && <PlatformReviewsTab />}
        </main>
      </div>
    </div>
  );
};

export default PlatformAdmin;
