import { createContext, useContext, useState, ReactNode } from "react";
import { CartItem } from "@/types/service";

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (serviceId: string) => void;
  updateItemInterval: (serviceId: string, interval: string) => void;
  clearCart: () => void;
  total: number;
  count: number;
  businessId: string | null;
  businessName: string | null;
  businessLogoUrl: string | null;
  setCartBusiness: (id: string, name: string, logoUrl?: string) => void;
}

const CartContext = createContext<CartContextType | null>(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null);

  const setCartBusiness = (id: string, name: string, logoUrl?: string) => {
    if (businessId && businessId !== id) {
      setItems([]);
    }
    setBusinessId(id);
    setBusinessName(name);
    setBusinessLogoUrl(logoUrl || null);
  };

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
    setItems((prev) => {
      const next = prev.filter((i) => i.serviceId !== serviceId);
      if (next.length === 0) {
        setBusinessId(null);
        setBusinessName(null);
        setBusinessLogoUrl(null);
      }
      return next;
    });
  };

  const updateItemInterval = (serviceId: string, interval: string) => {
    setItems((prev) =>
      prev.map((i) => i.serviceId === serviceId ? { ...i, interval } : i)
    );
  };

  const clearCart = () => {
    setItems([]);
    setBusinessId(null);
    setBusinessName(null);
    setBusinessLogoUrl(null);
  };

  const total = items.reduce((acc, i) => acc + i.total * i.quantity, 0);
  const count = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateItemInterval, clearCart, total, count, businessId, businessName, businessLogoUrl, setCartBusiness }}>
      {children}
    </CartContext.Provider>
  );
};
