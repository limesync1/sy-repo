import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import Index from "./pages/Index";
import BusinessPage from "./pages/BusinessPage";
import DynamicBusinessPage from "./pages/DynamicBusinessPage";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import CustomerDashboard from "./pages/CustomerDashboard";
import Search from "./pages/Search";
import RequestQuote from "./pages/RequestQuote";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/dashboard" element={<CustomerDashboard />} />
            <Route path="/demo" element={<BusinessPage />} />
            <Route path="/search" element={<Search />} />
            <Route path="/quote" element={<CartProvider><RequestQuote /></CartProvider>} />
            <Route path="/b/:slug" element={<DynamicBusinessPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
