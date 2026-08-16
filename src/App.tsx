import { lazy, Suspense, useEffect, useState } from "react";
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
import ChunkErrorBoundary from "@/components/ChunkErrorBoundary";
import StickyMobileCTA from "@/components/conversion/StickyMobileCTA";
import { startVersionCheck, isStaleDeploy } from "@/lib/version-check";

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

// Wrap dynamic imports so we recover gracefully when a deploy invalidates the
// chunk hash the user's cached index.js refers to ("Failed to fetch
// dynamically imported module"). We retry once, then force a single hard
// reload so the browser fetches the fresh manifest.
const RELOAD_FLAG = "__lovable_chunk_reloaded__";
const isChunkLoadError = (err: any) => {
  const msg = String(err?.message || err || "");
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Importing a module script failed")
  );
};
const retryImport = <T,>(loader: () => Promise<T>): Promise<T> =>
  loader().catch((err) => {
    if (!isChunkLoadError(err)) throw err;
    // One in-memory retry first (covers transient network blips)
    return new Promise<T>((resolve, reject) => {
      setTimeout(() => {
        loader().then(resolve).catch((err2) => {
          if (!isChunkLoadError(err2)) return reject(err2);
          // Stale deploy — reload once to pick up the new manifest
          try {
            if (typeof window !== "undefined" && !sessionStorage.getItem(RELOAD_FLAG)) {
              sessionStorage.setItem(RELOAD_FLAG, "1");
              window.location.reload();
              return;
            }
          } catch {}
          reject(err2);
        });
      }, 400);
    });
  });

const lazyRoute = <T,>(key: string, loader: () => Promise<T>) => {
  const safeLoader = () => retryImport(loader);
  registerLazyRoute(key, safeLoader as any);
  return lazy(safeLoader as any);
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
const DataProcessingAgreement = lazyRoute("dpa", () => import("./pages/legal/DataProcessingAgreement"));
const SubProcessors          = lazyRoute("subprocessors", () => import("./pages/legal/SubProcessors"));
const CleaningPriceGuide     = lazyRoute("/priser/rengoering", () => import("./pages/guides/CleaningPriceGuide"));
const MovingPriceGuide       = lazyRoute("/priser/flyttehjaelp", () => import("./pages/guides/MovingPriceGuide"));
const LaminateCleaningGuide  = lazyRoute("/guides/rengoering-af-laminatgulv", () => import("./pages/guides/LaminateCleaningGuide"));
const HandymanPriceGuide     = lazyRoute("/priser/haandvaerker", () => import("./pages/guides/HandymanPriceGuide"));
const PainterPriceGuide      = lazyRoute("/priser/maler", () => import("./pages/guides/PainterPriceGuide"));
const WindowCleaningGuide    = lazyRoute("/priser/vinduespudser", () => import("./pages/guides/WindowCleaningPriceGuide"));
const PlumberPriceGuide      = lazyRoute("/priser/vvs", () => import("./pages/guides/PlumberPriceGuide"));
const GardenPriceGuide       = lazyRoute("/priser/haveservice", () => import("./pages/guides/GardenPriceGuide"));
const ElectricianPriceGuide  = lazyRoute("/priser/elektriker", () => import("./pages/guides/ElectricianPriceGuide"));
const CarpenterPriceGuide    = lazyRoute("/priser/tomrer", () => import("./pages/guides/CarpenterPriceGuide"));
const MasonPriceGuide        = lazyRoute("/priser/murer", () => import("./pages/guides/MasonPriceGuide"));
const PestControlGuide       = lazyRoute("/priser/skadedyr", () => import("./pages/guides/PestControlPriceGuide"));
const LandscapingGuide       = lazyRoute("/priser/anlaegsgartner", () => import("./pages/guides/LandscapingPriceGuide"));
const FloorLayerGuide        = lazyRoute("/priser/gulvlaegger", () => import("./pages/guides/FloorLayerPriceGuide"));
const ChimneySweepGuide      = lazyRoute("/priser/skorstensfejer", () => import("./pages/guides/ChimneySweepPriceGuide"));
const AlgaeTreatmentGuide    = lazyRoute("/priser/algebehandling", () => import("./pages/guides/AlgaeTreatmentPriceGuide"));
const SecurityGuide          = lazyRoute("/priser/sikkerhed", () => import("./pages/guides/SecurityPriceGuide"));
const HeatPumpGuide          = lazyRoute("/priser/varmepumpe", () => import("./pages/guides/HeatPumpPriceGuide"));
const NewRoofGuide           = lazyRoute("/priser/nyt-tag", () => import("./pages/guides/NewRoofPriceGuide"));
const BathroomGuide          = lazyRoute("/priser/nyt-badevaerelse", () => import("./pages/guides/BathroomPriceGuide"));
const WindowReplacementGuide = lazyRoute("/priser/vinduesudskiftning", () => import("./pages/guides/WindowReplacementPriceGuide"));
const SewerGuide             = lazyRoute("/priser/kloakmester", () => import("./pages/guides/SewerPriceGuide"));
const CraftsmanTaxGuide      = lazyRoute("/guides/haandvaerkerfradrag-2026", () => import("./pages/guides/CraftsmanTaxDeduction2026"));
const ServiceTaxGuide        = lazyRoute("/guides/servicefradrag-2026", () => import("./pages/guides/ServiceTaxDeduction2026"));
const CleaningHub            = lazyRoute("/guides/rengoering", () => import("./pages/guides/CleaningHub"));
const MovingHub              = lazyRoute("/guides/flytning", () => import("./pages/guides/MovingHub"));
const HandymanHub            = lazyRoute("/guides/haandvaerker", () => import("./pages/guides/HandymanHub"));
const GardenHub              = lazyRoute("/guides/have", () => import("./pages/guides/GardenHub"));
const PricesHub              = lazyRoute("/guides/priser-2026", () => import("./pages/guides/PricesHub"));
const GuidesIndex            = lazyRoute("/guides", () => import("./pages/GuidesIndex"));
// ── Offentligt produktunivers (/software) ────────────────────────────────
const SoftwareHub            = lazyRoute("/software", () => import("./pages/software/SoftwareHub"));
const SoftwareRoutePlanner   = lazyRoute("/software/ruteplanlaegger", () => import("./pages/software/RoutePlannerFeature"));
const SoftwareFeatureGuide   = lazyRoute("/software/funktioner", () => import("./pages/software/FeatureGuidePage"));
const SoftwareEmployeeApp    = lazyRoute("/software/medarbejder-app", () => import("./pages/software/EmployeeAppFeature"));
const SoftwareBooking        = lazyRoute("/software/booking-og-tilbud", () => import("./pages/software/BookingQuotesFeature"));
const SoftwareInvoicing      = lazyRoute("/software/fakturering-og-regnskab", () => import("./pages/software/InvoicingAccountingFeature"));
const SoftwareIndustries     = lazyRoute("/software/brancher", () => import("./pages/software/IndustriesPage"));
const SoftwarePricing        = lazyRoute("/software/priser", () => import("./pages/software/PricingPage"));
const SoftwareWindowCleaner  = lazyRoute("/software/vinduespudser", () => import("./pages/software/WindowCleanerSoftware"));
const SoftwareCleaning       = lazyRoute("/software/rengoering", () => import("./pages/software/CleaningSoftware"));
const SoftwareGarden         = lazyRoute("/software/haveservice", () => import("./pages/software/GardenSoftware"));
const SoftwareHandyman       = lazyRoute("/software/haandvaerker", () => import("./pages/software/HandymanSoftware"));
const CleaningCityPage       = lazyRoute("/rengoering/:city", () => import("./pages/cities/CleaningCityPage"));
const MovingCityPage         = lazyRoute("/flyttehjaelp/:city", () => import("./pages/cities/MovingCityPage"));
const HandymanCityPage       = lazyRoute("/haandvaerker/:city", () => import("./pages/cities/HandymanCityPage"));
const GardenCityPage         = lazyRoute("/haveservice/:city", () => import("./pages/cities/GardenCityPage"));
const BlogIndex              = lazyRoute("/blog", () => import("./pages/blog/BlogIndex"));
const BlogCategoryIndex      = lazyRoute("/blog/kategori", () => import("./pages/blog/BlogCategoryIndex"));

// ── Datadrevne blog-ruter ────────────────────────────────────────────────
// Hver post i BLOG_POSTS bærer sin egen lazy loader. Vi mapper dem til en
// stabil React.lazy() én gang her, så samme komponent genbruges mellem
// renders (ellers ville Suspense vise tom fallback ved hver navigation).
// Tilføj en ny artikel = tilføj én entry i blogPosts.ts. Ingen ændring i
// App.tsx eller sitemap.xml er nødvendig.
import { BLOG_POSTS } from "./pages/blog/blogPosts";
const BLOG_ROUTES = BLOG_POSTS.map((post) => ({
  path: `/blog/${post.slug}`,
  Component: lazyRoute(`/blog/${post.slug}`, post.loader),
}));
const HelpCenter             = lazyRoute("/hjaelp", () => import("./pages/HelpCenter"));
const AboutUs                = lazyRoute("/om-os", () => import("./pages/AboutUs"));
const Reviews                = lazyRoute("/anmeldelser", () => import("./pages/Reviews"));
const Contact                = lazyRoute("/kontakt", () => import("./pages/Contact"));
const VisualTestPlanner      = lazyRoute("visual-test-planner", () => import("./pages/VisualTestPlanner"));
const VisualTestLivechat     = lazyRoute("visual-test-livechat", () => import("./pages/VisualTestLivechat"));

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

/** Mounter children først når browseren er idle (eller efter 2.5s fallback).
 *  Bruges til ikke-kritiske widgets som livechat, så de ikke blokerer FCP. */
const IdleMount = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    const trigger = () => setReady(true);
    const id = ric ? ric(trigger, { timeout: 2500 }) : window.setTimeout(trigger, 2500);
    return () => {
      if (ric && (window as any).cancelIdleCallback) (window as any).cancelIdleCallback(id);
      else window.clearTimeout(id as number);
    };
  }, []);
  return ready ? <>{children}</> : null;
};

/** Starter periodisk version-check og reloader stille ved næste rute-skift
 *  hvis en ny deploy bliver opdaget. */
const DeployVersionWatcher = () => {
  useEffect(() => startVersionCheck(), []);
  useEffect(() => {
    // Når brugeren navigerer (popstate eller programmatisk push), og vi har
    // registreret en ny deploy, så reload — det er det mindst forstyrrende
    // tidspunkt at hente den nye bundle på.
    const maybeReload = () => {
      if (isStaleDeploy()) window.location.reload();
    };
    window.addEventListener("popstate", maybeReload);
    return () => window.removeEventListener("popstate", maybeReload);
  }, []);
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
              <IdleMount>
                <LiveChatWidget />
              </IdleMount>
            </Suspense>
            {/* Cookie-banner — vises kun første gang valget træffes. */}
            <CookieConsent />
            <IdlePrefetcher />
            <DeployVersionWatcher />
            <StickyMobileCTA />
            <ChunkErrorBoundary>
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

              {/* ── Produktsider (software) ── */}
              <Route path="/software" element={<SoftwareHub />} />
              <Route path="/software/ruteplanlaegger" element={<SoftwareRoutePlanner />} />
              <Route path="/software/funktioner" element={<SoftwareFeatureGuide />} />
              <Route path="/software/medarbejder-app" element={<SoftwareEmployeeApp />} />
              <Route path="/software/booking-og-tilbud" element={<SoftwareBooking />} />
              <Route path="/software/fakturering-og-regnskab" element={<SoftwareInvoicing />} />
              <Route path="/software/brancher" element={<SoftwareIndustries />} />
              <Route path="/software/priser" element={<SoftwarePricing />} />
              <Route path="/software/vinduespudser" element={<SoftwareWindowCleaner />} />
              <Route path="/software/rengoering" element={<SoftwareCleaning />} />
              <Route path="/software/haveservice" element={<SoftwareGarden />} />
              <Route path="/software/haandvaerker" element={<SoftwareHandyman />} />

              {/* ── Juridiske sider ── */}
              <Route path="/privatlivspolitik" element={<PrivacyPolicy />} />
              <Route path="/vilkaar" element={<Terms />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/databehandleraftale" element={<DataProcessingAgreement />} />
              <Route path="/underdatabehandlere" element={<SubProcessors />} />

              {/* ── Prisguides (SEO landing pages) ── */}
              <Route path="/priser/rengoering" element={<CleaningPriceGuide />} />
              <Route path="/priser/flyttehjaelp" element={<MovingPriceGuide />} />
              <Route path="/priser/haandvaerker" element={<HandymanPriceGuide />} />
              <Route path="/priser/maler" element={<PainterPriceGuide />} />
              <Route path="/priser/vinduespudser" element={<WindowCleaningGuide />} />
              <Route path="/priser/vvs" element={<PlumberPriceGuide />} />
              <Route path="/priser/haveservice" element={<GardenPriceGuide />} />
              <Route path="/priser/elektriker" element={<ElectricianPriceGuide />} />
              <Route path="/priser/tomrer" element={<CarpenterPriceGuide />} />
              <Route path="/priser/murer" element={<MasonPriceGuide />} />
              <Route path="/priser/skadedyr" element={<PestControlGuide />} />
              <Route path="/priser/anlaegsgartner" element={<LandscapingGuide />} />
              <Route path="/priser/gulvlaegger" element={<FloorLayerGuide />} />
              <Route path="/priser/skorstensfejer" element={<ChimneySweepGuide />} />
              <Route path="/priser/algebehandling" element={<AlgaeTreatmentGuide />} />
              <Route path="/priser/sikkerhed" element={<SecurityGuide />} />
              <Route path="/priser/varmepumpe" element={<HeatPumpGuide />} />
              <Route path="/priser/nyt-tag" element={<NewRoofGuide />} />
              <Route path="/priser/nyt-badevaerelse" element={<BathroomGuide />} />
              <Route path="/priser/vinduesudskiftning" element={<WindowReplacementGuide />} />
              <Route path="/priser/kloakmester" element={<SewerGuide />} />
              <Route path="/guides/haandvaerkerfradrag-2026" element={<CraftsmanTaxGuide />} />
              <Route path="/guides/servicefradrag-2026" element={<ServiceTaxGuide />} />
              <Route path="/guides/rengoering-af-laminatgulv" element={<LaminateCleaningGuide />} />
              <Route path="/guides/rengoering" element={<CleaningHub />} />
              <Route path="/guides/flytning" element={<MovingHub />} />
              <Route path="/guides/haandvaerker" element={<HandymanHub />} />
              <Route path="/guides/have" element={<GardenHub />} />
              <Route path="/guides/priser-2026" element={<PricesHub />} />
              <Route path="/guides" element={<GuidesIndex />} />

              {/* ── By-landingssider for rengøring (SEO) ── */}
              <Route path="/rengoering/:city" element={<CleaningCityPage />} />
              <Route path="/flyttehjaelp/:city" element={<MovingCityPage />} />
              <Route path="/haandvaerker/:city" element={<HandymanCityPage />} />
              <Route path="/haveservice/:city" element={<GardenCityPage />} />

              {/* ── Blog (long-form artikler) ── */}
              <Route path="/blog" element={<BlogIndex />} />
              <Route path="/blog/kategori/:slug" element={<BlogCategoryIndex />} />
              {BLOG_ROUTES.map(({ path, Component }) => (
                <Route key={path} path={path} element={<Component />} />
              ))}
              <Route path="/hjaelp" element={<HelpCenter />} />
              <Route path="/om-os" element={<AboutUs />} />
              <Route path="/anmeldelser" element={<Reviews />} />
              <Route path="/kontakt" element={<Contact />} />

              {/* ── Visual regression fixture (e2e only, ingen auth) ── */}
              <Route path="/__visual/planner" element={<VisualTestPlanner />} />
              <Route path="/__visual/livechat" element={<VisualTestLivechat />} />

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
            </ChunkErrorBoundary>
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
