import { Package } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";

/**
 * Lille flydende handle nederst til højre der lader brugeren genåbne
 * deres bestillings-sheet hvis de lukkede den. Skjult når kurven er tom
 * eller sheeten allerede er åben — vi vil ikke distrahere fra hovedindholdet.
 *
 * Vises kun på virksomhedssider (/v/:slug, /demo) eller på tilbudssiden
 * (/tilbud) hvor brugeren netop har indhentet tilbud. På resten af platformen
 * (forside, søgning, admin osv.) skal knappen ikke distrahere.
 */
const CartFab = () => {
  const { count, sheetOpen, openSheet } = useCart();
  const { pathname } = useLocation();
  if (count === 0 || sheetOpen) return null;
  const allowed =
    pathname.startsWith("/v/") ||
    pathname === "/demo" ||
    pathname === "/tilbud";
  if (!allowed) return null;
  return (
    <button
      type="button"
      onClick={openSheet}
      aria-label={`Åbn bestilling med ${count} ${count === 1 ? "service" : "services"}`}
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-[0_18px_40px_-16px_hsl(var(--foreground)/0.55)] transition-all hover:bg-foreground/90 hover:shadow-[0_22px_50px_-16px_hsl(var(--foreground)/0.6)] active:scale-95 sm:bottom-6 sm:right-6"
    >
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-background/15">
        <Package className="h-4 w-4" />
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground ring-2 ring-foreground">
          {count}
        </span>
      </span>
      <span>Bestilling</span>
    </button>
  );
};

export default CartFab;