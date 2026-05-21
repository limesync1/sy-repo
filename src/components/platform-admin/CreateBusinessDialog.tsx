// CreateBusinessDialog — admin opretter en virksomhed manuelt.
// Kalder admin-create-business edge function der finder/opretter ejer-bruger,
// laver business + plan-række, og sender velkomstmail.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Building2, Copy } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateBusinessDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [trialDays, setTrialDays] = useState("14");
  const [sendWelcome, setSendWelcome] = useState(true);
  const [result, setResult] = useState<{ password?: string | null; existed: boolean; slug: string } | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-create-business", {
        body: {
          name: name.trim(),
          ownerEmail: ownerEmail.trim().toLowerCase(),
          category: category.trim() || null,
          city: city.trim() || null,
          phone: phone.trim() || null,
          trialDays: parseInt(trialDays, 10) || 0,
          sendWelcome,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as any;
    },
    onSuccess: (data) => {
      toast.success("Virksomhed oprettet");
      qc.invalidateQueries({ queryKey: ["admin-businesses"] });
      qc.invalidateQueries({ queryKey: ["admin-business-plans"] });
      qc.invalidateQueries({ queryKey: ["admin-audit-log-all"] });
      setResult({ password: data.temporaryPassword, existed: data.userExisted, slug: data.slug });
    },
    onError: (e: any) => toast.error(e.message || "Oprettelse fejlede"),
  });

  const reset = () => {
    setName(""); setOwnerEmail(""); setCategory("");
    setCity(""); setPhone(""); setTrialDays("14");
    setSendWelcome(true); setResult(null);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Opret virksomhed
          </DialogTitle>
          <DialogDescription>
            Opret en virksomhedskonto manuelt. Hvis ejer-e-mailen ikke findes oprettes en ny bruger automatisk.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <p className="font-semibold text-emerald-900">Virksomhed oprettet ✓</p>
              <p className="text-emerald-800 text-xs mt-1">Slug: /b/{result.slug}</p>
              <p className="text-emerald-800 text-xs">
                {result.existed ? "Eksisterende bruger blev tildelt som ejer." : "Ny bruger oprettet."}
              </p>
            </div>
            {result.password && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="font-semibold text-amber-900">Engangskodeord</p>
                <p className="text-amber-800 text-xs mt-1">
                  Send dette til ejeren hvis velkomstmailen ikke modtages.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded bg-white px-2 py-1.5 font-mono text-sm">{result.password}</code>
                  <Button size="sm" variant="outline" className="h-8"
                    onClick={() => { navigator.clipboard.writeText(result.password!); toast.success("Kopieret"); }}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => handleClose(false)}>Luk</Button>
              <Button onClick={() => { reset(); }}>Opret en til</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="b-name">Virksomhedsnavn *</Label>
              <Input id="b-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ready2Clean ApS" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-email">Ejer-e-mail *</Label>
              <Input id="b-email" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="ejer@eksempel.dk" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-cat">Kategori</Label>
                <Input id="b-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Rengøring" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-city">By</Label>
                <Input id="b-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="København" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-phone">Telefon</Label>
                <Input id="b-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+45 ..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-trial">Prøveperiode (dage)</Label>
                <Input id="b-trial" type="number" value={trialDays} onChange={(e) => setTrialDays(e.target.value)} min={0} max={365} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={sendWelcome} onCheckedChange={(c) => setSendWelcome(!!c)} />
              Send velkomstmail til ejeren
            </label>

            <DialogFooter>
              <Button variant="ghost" onClick={() => handleClose(false)}>Annullér</Button>
              <Button onClick={() => create.mutate()}
                disabled={create.isPending || !name.trim() || !ownerEmail.includes("@")}>
                {create.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Opretter…</> : "Opret virksomhed"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}