import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";

const CartSheet = () => {
  const { items, removeItem, clearCart, total, count } = useCart();
  const [checkout, setCheckout] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleOrder = () => {
    if (!name || !email || !phone) {
      toast.error("Udfyld venligst alle felter");
      return;
    }
    toast.success("Din ordre er modtaget! Vi kontakter dig snarest.");
    clearCart();
    setCheckout(false);
    setName("");
    setEmail("");
    setPhone("");
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative gap-2 border-accent/30 hover:bg-accent/10">
          <ShoppingCart className="h-5 w-5" />
          Kurv
          {count > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
              {count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Din kurv</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <ShoppingCart className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">Din kurv er tom</p>
          </div>
        ) : !checkout ? (
          <div className="flex flex-1 flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto py-4">
              {items.map((item) => (
                <div key={item.serviceId} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{item.serviceName}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">{item.details}</p>
                    </div>
                    <button onClick={() => removeItem(item.serviceId)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-2 text-right font-bold text-foreground">{item.total} kr</p>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4">
              <div className="mb-4 flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span>{total} kr</span>
              </div>
              <Button onClick={() => setCheckout(true)} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Gå til checkout
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col py-4">
            <div className="flex-1 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Fulde navn</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dit navn" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">E-mail</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="din@email.dk" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Telefon</label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+45 00 00 00 00" />
              </div>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Ordreopsummering</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((item) => (
                    <div key={item.serviceId} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.serviceName}</span>
                      <span className="font-medium">{item.total} kr</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span>{total} kr</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-2 border-t border-border pt-4">
              <Button onClick={handleOrder} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Bestil nu – {total} kr
              </Button>
              <Button variant="outline" onClick={() => setCheckout(false)} className="w-full">
                Tilbage til kurv
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
