import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateOrder, useCreateSubscription } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Package, CalendarClock, Store } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { INTERVAL_LABELS } from "@/types/service";

interface CartSheetProps {
  businessId?: string;
}

const CartSheet = ({ businessId: _businessIdProp }: CartSheetProps) => {
  const { items, removeItem, clearCart, total, count, groupedByBusiness } = useCart();
  const { user } = useAuth();
  const createOrder = useCreateOrder();
  const createSubscription = useCreateSubscription();
  const [checkout, setCheckout] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleOrder = async () => {
    if (!name || !email || !phone) {
      toast.error("Udfyld venligst alle felter");
      return;
    }

    try {
      for (const [businessId, group] of Object.entries(groupedByBusiness)) {
        const bizTotal = group.items.reduce((acc, i) => acc + i.total * i.quantity, 0);

        const orderResult = await createOrder.mutateAsync({
          order: {
            business_id: businessId === "unknown" ? undefined : businessId,
            customer_name: name,
            customer_email: email,
            customer_phone: phone,
            total_amount: bizTotal,
          },
          items: group.items.map((item) => ({
            service_id: item.serviceId,
            service_name: item.serviceName,
            quantity: item.quantity,
            unit_price: item.total,
            total_price: item.total * item.quantity,
            details: {
              description: item.details,
              interval: item.interval,
              stepDetails: item.stepDetails,
            },
          })),
        });

        if (user && businessId !== "unknown") {
          for (const item of group.items) {
            if (item.interval && item.interval !== "engangskøb") {
              await createSubscription.mutateAsync({
                customer_id: user.id,
                business_id: businessId,
                service_id: item.serviceId,
                service_name: item.serviceName,
                interval: item.interval,
                total_price: item.total,
                order_id: orderResult.id,
                details: {
                  description: item.details,
                  stepDetails: item.stepDetails,
                },
              });
            }
          }
        }
      }
    } catch (e: any) {
      toast.error("Fejl ved oprettelse af aftale: " + e.message);
      return;
    }

    toast.success("Din aftale er sendt! Virksomheden vil gennemgå og bekræfte den.");
    clearCart();
    setCheckout(false);
    setName(""); setEmail(""); setPhone("");
  };

  const businessCount = Object.keys(groupedByBusiness).length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative gap-2 border-accent/30 hover:bg-accent/10 hover:text-foreground hover:border-accent">
          <Package className="h-5 w-5" />
          Aftale
          {count > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
              {count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            <span className="block">Din aftale</span>
            {businessCount > 1 && (
              <span className="block text-xs font-normal text-muted-foreground">{businessCount} virksomheder</span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <Package className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">Din aftale er tom</p>
            <p className="mt-1 text-sm text-muted-foreground/70">Tilføj services fra virksomhedernes sider</p>
          </div>
        ) : !checkout ? (
          <div className="flex flex-1 flex-col">
            <div className="flex-1 space-y-5 overflow-y-auto py-4">
              {Object.entries(groupedByBusiness).map(([bizId, group]) => (
                <div key={bizId}>
                  <div className="flex items-center gap-2.5 mb-3 px-1">
                    {group.businessLogoUrl ? (
                      <img src={group.businessLogoUrl} alt="" className="h-7 w-7 rounded-lg object-contain bg-secondary p-0.5 border border-border" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary border border-border">
                        <Store className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <span className="text-sm font-semibold text-foreground">{group.businessName}</span>
                  </div>

                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <Card key={item.serviceId} className="border-border overflow-hidden">
                        <CardContent className="p-3.5 space-y-1.5">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-semibold text-foreground">{item.serviceName}</h4>
                              {item.interval && item.interval !== "engangskøb" && (
                                <Badge variant="secondary" className="mt-1 text-xs gap-1">
                                  <CalendarClock className="h-3 w-3" />
                                  {INTERVAL_LABELS[item.interval] || item.interval}
                                </Badge>
                              )}
                            </div>
                            <button onClick={() => removeItem(item.serviceId)} className="text-muted-foreground hover:text-destructive ml-2">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {item.stepDetails && item.stepDetails.length > 0 && (
                            <div className="rounded-lg bg-secondary/30 divide-y divide-border">
                              {item.stepDetails.map((sd, i) => (
                                <div key={i} className="flex justify-between px-3 py-1.5 text-xs">
                                  <span className="text-muted-foreground">{sd.label}: {sd.value} {sd.unit}</span>
                                  <span className="font-medium text-foreground">{sd.subtotal} kr</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {!item.stepDetails?.length && item.details && (
                            <p className="text-xs text-muted-foreground">{item.details}</p>
                          )}

                          <p className="text-right text-sm font-bold text-foreground">{item.total} kr</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4">
              <div className="mb-4 flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span>{total} kr</span>
              </div>
              <Button onClick={() => setCheckout(true)} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Gå til aftale
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col py-4">
            <div className="flex-1 space-y-4 overflow-y-auto">
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
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Aftaleopsummering</h4>

                  {Object.entries(groupedByBusiness).map(([bizId, group]) => {
                    const bizTotal = group.items.reduce((acc, i) => acc + i.total * i.quantity, 0);
                    return (
                      <div key={bizId} className="space-y-1.5">
                        <div className="flex items-center gap-2 pb-1 border-b border-border">
                          {group.businessLogoUrl && (
                            <img src={group.businessLogoUrl} alt="" className="h-5 w-5 rounded object-contain bg-secondary p-0.5" />
                          )}
                          <span className="text-sm font-medium text-foreground">{group.businessName}</span>
                          <span className="ml-auto text-xs font-semibold text-muted-foreground">{bizTotal} kr</span>
                        </div>
                        {group.items.map((item) => (
                          <div key={item.serviceId} className="space-y-0.5">
                            <div className="flex justify-between text-sm">
                              <span className="text-foreground">{item.serviceName}</span>
                              <span className="font-semibold">{item.total} kr</span>
                            </div>
                            {item.interval && item.interval !== "engangskøb" && (
                              <span className="text-xs text-accent">{INTERVAL_LABELS[item.interval]}</span>
                            )}
                            {item.stepDetails?.map((sd, i) => (
                              <div key={i} className="flex justify-between text-xs text-muted-foreground pl-2">
                                <span>{sd.label}: {sd.value} {sd.unit}</span>
                                <span>{sd.subtotal} kr</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  <div className="border-t border-border pt-2 flex justify-between font-bold">
                    <span>Total</span>
                    <span>{total} kr</span>
                  </div>
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground bg-accent/5 rounded-lg px-3 py-2 border border-accent/20">
                💡 Aftalen sendes til virksomheden for godkendelse. Du modtager besked når de har svaret.
              </p>

              {user && items.some(i => i.interval && i.interval !== "engangskøb") && (
                <p className="text-xs text-muted-foreground bg-accent/5 rounded-lg px-3 py-2 border border-accent/20">
                  🔄 Tilbagevendende services oprettes automatisk i dit kundepanel efter godkendelse.
                </p>
              )}
            </div>
            <div className="space-y-2 border-t border-border pt-4">
              <Button onClick={handleOrder} disabled={createOrder.isPending} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                {createOrder.isPending ? "Sender aftale..." : `Send aftale – ${total} kr`}
              </Button>
              <Button variant="outline" onClick={() => setCheckout(false)} className="w-full">
                Tilbage
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartSheet;
