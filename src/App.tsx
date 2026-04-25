import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { LocationProvider } from "@/contexts/LocationContext";
import Index from "./pages/Index";
import BusinessPage from "./pages/BusinessPage";
import DynamicBusinessPage from "./pages/DynamicBusinessPage";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import PlatformAdmin from "./pages/PlatformAdmin";
import CustomerDashboard from "./pages/CustomerDashboard";
import Search from "./pages/Search";
import RequestQuote from "./pages/RequestQuote";
import Unsubscribe from "./pages/Unsubscribe";
import RoutePlanner from "./pages/RoutePlanner";
import EmployeeApp from "./pages/EmployeeApp";
import EmployeeRoute from "./pages/EmployeeRoute";
import EmployeeRoutePrint from "./pages/EmployeeRoutePrint";
import EmployeeStats from "./pages/EmployeeStats";
import NotFound from "./pages/NotFound";
import ApproveOrder from "./pages/ApproveOrder";

const queryClient = new QueryClient();

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
