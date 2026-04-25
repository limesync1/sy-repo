import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { LocationProvider } from "@/contexts/LocationContext";

// Forsiden + Login indlæses ivrigt — alt andet er code-splittet via React.lazy
// så det første sidebesøg ikke trækker hele admin/medarbejder/ruteplanlægger
// med ned (som tidligere blev bundlet i én stor JS-fil).
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const BusinessPage          = lazy(() => import("./pages/BusinessPage"));
const DynamicBusinessPage   = lazy(() => import("./pages/DynamicBusinessPage"));
const Admin                 = lazy(() => import("./pages/Admin"));
const PlatformAdmin         = lazy(() => import("./pages/PlatformAdmin"));
const CustomerDashboard     = lazy(() => import("./pages/CustomerDashboard"));
const Search                = lazy(() => import("./pages/Search"));
const RequestQuote          = lazy(() => import("./pages/RequestQuote"));
const Unsubscribe           = lazy(() => import("./pages/Unsubscribe"));
const RoutePlanner          = lazy(() => import("./pages/RoutePlanner"));
const EmployeeApp           = lazy(() => import("./pages/EmployeeApp"));
const EmployeeRoute         = lazy(() => import("./pages/EmployeeRoute"));
const EmployeeRoutePrint    = lazy(() => import("./pages/EmployeeRoutePrint"));
const EmployeeStats         = lazy(() => import("./pages/EmployeeStats"));
const ApproveOrder          = lazy(() => import("./pages/ApproveOrder"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center text-muted-foreground">
    Indlæser...
  </div>
);

// Helper to preserve query strings on redirect
const RedirectWithQuery = ({ to }: { to: string }) => {
  const search = typeof window !== "undefined" ? window.location.search : "";
  return <Navigate to={to + search} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LocationProvider>
        <CartProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />

              {/* ── New Danish routes ── */}
              <Route path="/log-ind" element={<Auth />} />
              <Route path="/admin" element={<PlatformAdmin />} />
              <Route path="/virksomhed" element={<Admin />} />
              <Route path="/virksomhed/ruter" element={<RoutePlanner />} />
              <Route path="/medarbejder" element={<EmployeeApp />} />
              <Route path="/medarbejder/statistik" element={<EmployeeStats />} />
              <Route path="/medarbejder/rute/:routeId" element={<EmployeeRoute />} />
              <Route path="/medarbejder/rute/:routeId/print" element={<EmployeeRoutePrint />} />
              <Route path="/min-konto" element={<CustomerDashboard />} />
              <Route path="/virksomheder" element={<Search />} />
              <Route path="/tilbud" element={<RequestQuote />} />
              <Route path="/afmeld" element={<Unsubscribe />} />
              <Route path="/godkend-bestilling/:orderId" element={<ApproveOrder />} />
              <Route path="/v/:slug" element={<DynamicBusinessPage />} />
              <Route path="/demo" element={<BusinessPage />} />

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
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
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
