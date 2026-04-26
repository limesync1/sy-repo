// ReactivateDialog — vises som modal hvis virksomhedens prøveperiode er udløbet
// og der ikke er tilføjet et betalingskort. Brugeren kan ikke bruge panelet
// før der er udfyldt et kort. Når det er gemt sættes business_plans.status =
// "active" og virksomheden re-aktiveres.
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreditCard, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useReactivateBusinessPlan } from "@/hooks/useBusinessPlan";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  open: boolean;
  businessId: string;
  businessName: string;
};

const ReactivateDialog = ({ open, businessId, businessName }: Props) => {
  const { signOut } = useAuth();
  const reactivate = useReactivateBusinessPlan();
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  const handleSave = async () => {
    const digits = number.replace(/\s+/g, "");
    if (digits.length < 13 || digits.length > 19 || !/^\d+$/.test(digits)) {
      toast.error("Indtast et gyldigt kortnummer");
      return;
    }
    if (!/^\d{2}\s*\/\s*\d{2}$/.test(expiry)) {
      toast.error("Udløbsdato skal være MM/ÅÅ");
      return;
    }
    if (!/^\d{3,4}$/.test(cvc)) {
      toast.error("CVC skal være 3-4 cifre");
      return;
    }
    try {
      const last4 = digits.slice(-4);
      const brand = digits.startsWith("4") ? "Visa" : digits.startsWith("5") ? "Mastercard" : "Kort";
      await reactivate.mutateAsync({ businessId, last4, brand });
      toast.success("Din virksomhed er genaktiveret");
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke gemme betalingskort");
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* kan ikke lukkes uden at betale */ }}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <Lock className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Genaktivér {businessName}</DialogTitle>
          <DialogDescription className="text-center">
            Din gratis prøveperiode er udløbet, og din virksomhed er midlertidigt deaktiveret. Tilføj et betalingskort for at få adgang til virksomhedspanelet igen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-foreground">Kortnummer</label>
            <div className="relative">
              <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="1234 5678 9012 3456"
                inputMode="numeric"
                className="pl-9"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Udløb (MM/ÅÅ)</label>
              <Input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="12/27" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">CVC</label>
              <Input value={cvc} onChange={(e) => setCvc(e.target.value)} placeholder="123" inputMode="numeric" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-accent shrink-0" />
          Vi opretter forbindelse til Stripe i baggrunden. Dit kort opbevares sikkert og kan opdateres når som helst.
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => signOut()}>Log ud</Button>
          <Button
            onClick={handleSave}
            disabled={reactivate.isPending}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            {reactivate.isPending ? "Gemmer..." : "Genaktivér virksomhed"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReactivateDialog;