import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Navigate, Link } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, Building2, Users, ShoppingCart, Star,
  LogOut, Menu, X, Repeat, Settings, MessageCircle, ExternalLink,
} from "lucide-react";
import SEO from "@/components/SEO";
import { cn } from "@/lib/utils";
import PlatformOverviewTab from "@/components/platform-admin/PlatformOverviewTab";
import PlatformBusinessesTab from "@/components/platform-admin/PlatformBusinessesTab";
import PlatformUsersTab from "@/components/platform-admin/PlatformUsersTab";
import PlatformOrdersTab from "@/components/platform-admin/PlatformOrdersTab";
import PlatformSubscriptionsTab from "@/components/platform-admin/PlatformSubscriptionsTab";
import PlatformReviewsTab from "@/components/platform-admin/PlatformReviewsTab";
import PlatformSettingsTab from "@/components/platform-admin/PlatformPlatformSettingsTab";
import PlatformLiveChatTab from "@/components/platform-admin/PlatformLiveChatTab";
import { AdminFiltersProvider } from "@/components/platform-admin/lib/AdminFiltersContext";
import RangePicker from "@/components/platform-admin/RangePicker";

const NAV = [
  { value: "overview", label: "Overblik", icon: LayoutDashboard, hasRange: true },
  { value: "businesses", label: "Virksomheder", icon: Building2, hasRange: false },
  { value: "users", label: "Brugere", icon: Users, hasRange: false },
  { value: "orders", label: "Ordrer", icon: ShoppingCart, hasRange: true },
  { value: "subscriptions", label: "Abonnementer", icon: Repeat, hasRange: false },
  { value: "reviews", label: "Anmeldelser", icon: Star, hasRange: false },
  { value: "livechat", label: "Livechat", icon: MessageCircle, hasRange: false },
  { value: "settings", label: "Platform", icon: Settings, hasRange: false },
];

const PlatformAdmin = () => {
  const { user, loading, signOut } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const [tab, setTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading || roleLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Indlæser...</div>;
  }
  if (!user) return <Navigate to="/log-ind" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const current = NAV.find((n) => n.value === tab);

  return (
    <AdminFiltersProvider>
      <div className="flex min-h-screen bg-secondary/50">
        <SEO title="Platform Admin · Serviceydere" description="Administrér virksomheder, brugere og ordrer på Serviceydere." noIndex />

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar — samme look som virksomhedspanelet */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-border bg-background transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/serviceydere-logo-dark.webp"
                alt="Serviceydere"
                className="h-7 w-auto"
                width={1920}
                height={539}
                decoding="async"
                loading="lazy"
              />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
              aria-label="Luk menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Admin-info kort — matcher virksomhedspanelets info-blok */}
          <div className="mx-3 mt-3 mb-3 shrink-0 rounded-xl border border-border bg-card px-3 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-background font-bold text-sm">
                {(user.email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">Platform Admin</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-1 pb-2">
            {NAV.map((item) => {
              const active = tab === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => { setTab(item.value); setSidebarOpen(false); }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-left transition-colors duration-150",
                    active
                      ? "bg-secondary text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="shrink-0 space-y-1 border-t border-border px-3 py-3">
            <Link
              to="/virksomhed"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Building2 className="h-4 w-4 shrink-0" />
              Min virksomhed
            </Link>
            <Link
              to="/"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              Se forside
            </Link>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Log ud
            </button>
          </div>
        </aside>

        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-5 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
              aria-label="Åbn menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="truncate text-lg font-semibold text-foreground">{current?.label}</h1>
            {current?.hasRange && (
              <div className="ml-auto flex items-center gap-2 min-w-0">
                <RangePicker />
              </div>
            )}
          </header>

          <main className="flex-1 min-w-0 p-4 sm:p-6">
            {tab === "overview" && <PlatformOverviewTab />}
            {tab === "businesses" && <PlatformBusinessesTab />}
            {tab === "users" && <PlatformUsersTab />}
            {tab === "orders" && <PlatformOrdersTab />}
            {tab === "subscriptions" && <PlatformSubscriptionsTab />}
            {tab === "reviews" && <PlatformReviewsTab />}
            {tab === "livechat" && <PlatformLiveChatTab />}
            {tab === "settings" && <PlatformSettingsTab />}
          </main>
        </div>
      </div>
    </AdminFiltersProvider>
  );
};

export default PlatformAdmin;
