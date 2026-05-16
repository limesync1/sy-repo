import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { LocationProvider } from "@/contexts/LocationContext";
import ScrollToTop from "@/components/ScrollToTop";
import CookieConsent from "@/components/CookieConsent";

// Forsiden + Login indlæses ivrigt — alt andet er code-splittet via React.lazy
// så det første sidebesøg ikke trækker hele admin/medarbejder/ruteplanlægger
// med ned (som tidligere blev bundlet i én stor JS-fil).
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";

// Vi pakker lazy-imports som named factories, så vi kan trigge dem manuelt
// (idle-prefetch og hover-prefetch fra <SmartLink/>) — det får navigation til
// at føles instant uden at trække alt med ned i den initielle bundle.
import { registerLazyRoute } from "@/lib/route-prefetch";

const lazyRoute = <T,>(key: string, loader: () => Promise<T>) => {
  registerLazyRoute(key, loader as any);
  return lazy(loader as any);
};

const CartSheet              = lazyRoute("cart-sheet", () => import("@/components/business/CartSheet"));
const CartFab                = lazyRoute("cart-fab", () => import("@/components/business/CartFab"));
const LiveChatWidget         = lazyRoute("livechat-widget", () => import("@/components/livechat/LiveChatWidget"));
const BusinessPage           = lazyRoute("business-page", () => import("./pages/BusinessPage"));
const DynamicBusinessPage    = lazyRoute("dynamic-business-page", () => import("./pages/DynamicBusinessPage"));
const Admin                  = lazyRoute("admin", () => import("./pages/Admin"));
const PlatformAdmin          = lazyRoute("platform-admin", () => import("./pages/PlatformAdmin"));
const CustomerDashboard      = lazyRoute("customer-dashboard", () => import("./pages/CustomerDashboard"));
const Search                 = lazyRoute("/virksomheder", () => import("./pages/Search"));
const RequestQuote           = lazyRoute("/tilbud", () => import("./pages/RequestQuote"));
const Unsubscribe            = lazyRoute("unsubscribe", () => import("./pages/Unsubscribe"));
const RoutePlanner           = lazyRoute("route-planner", () => import("./pages/RoutePlanner"));
const EmployeeApp            = lazyRoute("employee-app", () => import("./pages/EmployeeApp"));
const EmployeeRoute          = lazyRoute("employee-route", () => import("./pages/EmployeeRoute"));
const EmployeeRoutePrint     = lazyRoute("employee-route-print", () => import("./pages/EmployeeRoutePrint"));
const EmployeeStats          = lazyRoute("employee-stats", () => import("./pages/EmployeeStats"));
const EmployeeLivechat       = lazyRoute("employee-livechat", () => import("./pages/EmployeeLivechat"));
const ApproveOrder           = lazyRoute("approve-order", () => import("./pages/ApproveOrder"));
const BusinessOnboarding     = lazyRoute("/opret-virksomhed", () => import("./components/admin/BusinessOnboarding"));
const PrivacyPolicy          = lazyRoute("privacy", () => import("./pages/legal/PrivacyPolicy"));
const Terms                  = lazyRoute("terms", () => import("./pages/legal/Terms"));
const Cookies                = lazyRoute("cookies", () => import("./pages/legal/Cookies"));

// Sensible cache defaults så fane-skift i virksomhedspanelet føles øjeblikkeligt
// (cached data vises først, refetch i baggrunden) og vi ikke spammer DB ved hvert
// window-focus.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,           // 1 min — undgå unødige refetches mellem fane-skift
      gcTime: 10 * 60_000,         // 10 min cache i hukommelsen
      refetchOnWindowFocus: false, // forstyr ikke brugeren ved tab-skift
      // Retry transient fejl (network / 5xx) op til 2 gange med eksponentiel
      // backoff. Permanente fejl (4xx, valideringsfejl) faler øjeblikkeligt
      // så UI ikke "hænger" på en hopeløs request.
      retry: (failureCount, error: any) => {
        if (failureCount >= 2) return false;
        const status = error?.status ?? error?.statusCode;
        if (status && status >= 400 && status < 500) return false;
        return true;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    },
    mutations: {
      // Mutationer (drag/drop, redigeringer) bruger MutationQueue's egen
      // retry-logik, så vi lader react-query selv kun prøve én ekstra gang.
      retry: 1,
      retryDelay: 500,
    },
  },
});

const PageFallback = () => (
  // Tom fallback undgår "flash of loading text" ved lynhurtige chunk-loads.
  // Browseren viser stadig forrige route via Suspense indtil næste er klar.
  <div className="min-h-screen bg-background" aria-hidden />
);

/** Forwarmer de mest sandsynlige næste-sider (Find services, Få tilbud,
 *  Bliv udbyder) i browser-idle, så et klik fra forsiden føles instant. */
const useIdlePrefetch = () => {
  useEffect(() => {
    const keys = ["/virksomheder", "/tilbud", "/opret-virksomhed"];
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    const trigger = () => {
      import("@/lib/route-prefetch").then((m) => {
        keys.forEach((k) => m.prefetchLazyRoute(k));
      });
    };
    if (ric) ric(trigger, { timeout: 2000 });
    else setTimeout(trigger, 1500);
  }, []);
};

const IdlePrefetcher = () => {
  useIdlePrefetch();
  return null;
};

// Helper to preserve query strings on redirect
const RedirectWithQuery = ({ to }: { to: string }) => {
  const search = typeof window !== "undefined" ? window.location.search : "";
  return <Navigate to={to + search} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LocationProvider>
        <BrowserRouter>
          <CartProvider>
            <TooltipProvider>
            <Toaster />
            <Sonner />
            {/* Scroller automatisk til toppen når ruten ændres. */}
            <ScrollToTop />
            {/* Global bestillings-sheet + flydende genåbn-knap — lazy-loadede,
                så de ikke blokerer FCP for forsiden. */}
            <Suspense fallback={null}>
              <CartSheet />
              <CartFab />
              <LiveChatWidget />
            </Suspense>
            {/* Cookie-banner — vises kun første gang valget træffes. */}
            <CookieConsent />
            <IdlePrefetcher />
            <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />

              {/* ── New Danish routes ── */}
              <Route path="/log-ind" element={<Auth />} />
             <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin" element={<PlatformAdmin />} />
              <Route path="/virksomhed" element={<Admin />} />
              <Route path="/virksomhed/ruter" element={<RoutePlanner />} />
              <Route path="/medarbejder" element={<EmployeeApp />} />
              <Route path="/medarbejder/statistik" element={<EmployeeStats />} />
              <Route path="/medarbejder/livechat" element={<EmployeeLivechat />} />
              <Route path="/medarbejder/rute/:routeId" element={<EmployeeRoute />} />
              <Route path="/medarbejder/rute/:routeId/print" element={<EmployeeRoutePrint />} />
              <Route path="/min-konto" element={<CustomerDashboard />} />
              <Route path="/virksomheder" element={<Search />} />
              <Route path="/tilbud" element={<RequestQuote />} />
              <Route path="/afmeld" element={<Unsubscribe />} />
              <Route path="/godkend-bestilling/:orderId" element={<ApproveOrder />} />
              <Route path="/v/:slug" element={<DynamicBusinessPage />} />
              <Route path="/demo" element={<BusinessPage />} />
              <Route path="/opret-virksomhed" element={<BusinessOnboarding />} />

              {/* ── Juridiske sider ── */}
              <Route path="/privatlivspolitik" element={<PrivacyPolicy />} />
              <Route path="/vilkaar" element={<Terms />} />
              <Route path="/cookies" element={<Cookies />} />

              {/* ── Legacy redirects (preserve bookmarks & SEO) ── */}
              <Route path="/auth" element={<RedirectWithQuery to="/log-ind" />} />
              <Route path="/platform-admin" element={<RedirectWithQuery to="/admin" />} />
              {/* Old /admin (business panel) → /virksomhed. The new /admin is platform-admin. */}
              <Route path="/dashboard" element={<RedirectWithQuery to="/min-konto" />} />
              <Route path="/search" element={<RedirectWithQuery to="/virksomheder" />} />
              <Route path="/quote" element={<RedirectWithQuery to="/tilbud" />} />
              <Route path="/unsubscribe" element={<RedirectWithQuery to="/afmeld" />} />
              <Route path="/b/:slug" element={<LegacyBusinessRedirect />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </TooltipProvider>
          </CartProvider>
        </BrowserRouter>
      </LocationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

// Redirect /b/:slug → /v/:slug
const LegacyBusinessRedirect = () => {
  const slug = typeof window !== "undefined"
    ? window.location.pathname.replace(/^\/b\//, "")
    : "";
  return <Navigate to={`/v/${slug}${window.location.search}`} replace />;
};

export default App;
