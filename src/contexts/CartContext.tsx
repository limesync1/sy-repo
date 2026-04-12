import { createContext, useContext, useState, ReactNode } from "react";
import { CartItem } from "@/types/service";

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (serviceId: string) => void;
  clearCart: () => void;
  total: number;
  count: number;
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

  const clearCart = () => setItems([]);

  const total = items.reduce((acc, i) => acc + i.total * i.quantity, 0);
  const count = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
};
