import { createContext, useContext, useState, ReactNode } from "react";
import { CartItem } from "@/types/service";

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (serviceId: string) => void;
  updateItemInterval: (serviceId: string, interval: string) => void;
  clearCart: () => void;
  clearBusinessItems: (businessId: string) => void;
  total: number;
  count: number;
  /** Grouped items by businessId */
  groupedByBusiness: Record<string, { businessName: string; businessLogoUrl?: string; items: CartItem[] }>;
}

const CartContext = createContext<CartContextType | null>(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.serviceId === item.serviceId);
      if (existing) {
        return prev.map((i) => i.serviceId === item.serviceId ? item : i);
      }
      return [...prev, item];
    });
  };

  const removeItem = (serviceId: string) => {
    setItems((prev) => prev.filter((i) => i.serviceId !== serviceId));
  };

  const updateItemInterval = (serviceId: string, interval: string) => {
    setItems((prev) =>
      prev.map((i) => i.serviceId === serviceId ? { ...i, interval } : i)
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const clearBusinessItems = (businessId: string) => {
    setItems((prev) => prev.filter((i) => i.businessId !== businessId));
  };

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
    <CartContext.Provider value={{ items, addItem, removeItem, updateItemInterval, clearCart, clearBusinessItems, total, count, groupedByBusiness }}>
      {children}
    </CartContext.Provider>
  );
};
