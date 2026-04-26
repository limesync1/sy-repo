import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { CartItem } from "@/types/service";

const STORAGE_KEY = "serviceydere_cart";

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (serviceId: string) => void;
  updateItemInterval: (serviceId: string, interval: string) => void;
  clearCart: () => void;
  clearBusinessItems: (businessId: string) => void;
  total: number;
  count: number;
  groupedByBusiness: Record<string, { businessName: string; businessLogoUrl?: string; items: CartItem[] }>;
  /** Om bestillings-sheet'en er åben — styres globalt så addItem kan auto-åbne den. */
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  openSheet: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
};

const loadCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveCart = (items: CartItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { /* quota exceeded — silently fail */ }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Persist to localStorage on every change
  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.serviceId === item.serviceId);
      if (existing) {
        return prev.map((i) => i.serviceId === item.serviceId ? item : i);
      }
      return [...prev, item];
    });
    // Slid bestillings-sheet ud fra højre, så brugeren ser hvad de har valgt
    setSheetOpen(true);
  }, []);

  const removeItem = useCallback((serviceId: string) => {
    setItems((prev) => prev.filter((i) => i.serviceId !== serviceId));
  }, []);

  const updateItemInterval = useCallback((serviceId: string, interval: string) => {
    setItems((prev) =>
      prev.map((i) => i.serviceId === serviceId ? { ...i, interval } : i)
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const clearBusinessItems = useCallback((businessId: string) => {
    setItems((prev) => prev.filter((i) => i.businessId !== businessId));
  }, []);

  const total = items.reduce((acc, i) => acc + i.total * i.quantity, 0);
  const count = items.reduce((acc, i) => acc + i.quantity, 0);

  // Group items by business
  const groupedByBusiness: Record<string, { businessName: string; businessLogoUrl?: string; items: CartItem[] }> = {};
  items.forEach((item) => {
    const bId = item.businessId || "unknown";
    if (!groupedByBusiness[bId]) {
      groupedByBusiness[bId] = {
        businessName: item.businessName || "Ukendt virksomhed",
        businessLogoUrl: item.businessLogoUrl || undefined,
        items: [],
      };
    }
    groupedByBusiness[bId].items.push(item);
  });

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateItemInterval, clearCart, clearBusinessItems,
      total, count, groupedByBusiness,
      sheetOpen, setSheetOpen, openSheet: () => setSheetOpen(true),
    }}>
      {children}
    </CartContext.Provider>
  );
};
