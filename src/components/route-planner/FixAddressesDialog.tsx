import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AddressAutocomplete, { type AddressValue } from "@/components/shared/AddressAutocomplete";
import { supabase } from "@/integrations/supabase/client";

type Job = { id: string; customer_name?: string | null; address?: string | null; zip_code?: string | null; city?: string | null };

/** Retter adresser, der ikke kan vises på kortet — én aftale ad gangen, direkte fra puljen. */
export default function FixAddressesDialog({ jobs, open, onOpenChange }: { jobs: Job[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState<AddressValue>({ address: "", zip_code: "", city: "" });
  const [saving, setSaving] = useState(false);
  const [fixed, setFixed] = useState<Set<string>>(new Set());
  const remaining = jobs.filter((j) => !fixed.has(j.id));
  const job = remaining[Math.min(idx, remaining.length - 1)];

  useEffect(() => { if (open) { setIdx(0); setFixed(new Set()); } }, [open]);
  useEffect(() => {
    if (job) setValue({ address: job.address || "", zip_code: job.zip_code || "", city: job.city || "" });
  }, [job?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const verified = value.latitude != null && value.longitude != null;

  const save = async () => {
    if (!job || !verified) return;
    setSaving(true);
    const { error } = await supabase.from("orders").update({
      address: value.address, zip_code: value.zip_code, city: value.city,
      latitude: value.latitude, longitude: value.longitude,
    }).eq("id", job.id);
    setSaving(false);
    if (error) { toast.error("Adressen kunne ikke gemmes. Prøv igen."); return; }
    setFixed((prev) => new Set(prev).add(job.id));
    qc.invalidateQueries({ queryKey: ["unassigned-jobs"] });
    qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0] ?? "").includes("unassigned") });
    toast.success(`Adresse rettet for ${job.customer_name || "kunden"}`);
    if (remaining.length <= 1) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Ret adresser</DialogTitle>
          <DialogDescription>
            {remaining.length === 0 ? "Alle adresser er rettet." : `${remaining.length} ${remaining.length === 1 ? "aftale mangler" : "aftaler mangler"} en adresse, der kan vises på kortet. Vælg den rigtige adresse fra listen.`}
          </DialogDescription>
        </DialogHeader>
        {job && (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-secondary/40 p-3 text-sm">
              <p className="font-semibold">{job.customer_name || "Kunde uden navn"}</p>
              <p className="text-muted-foreground">Nu: {[job.address, [job.zip_code, job.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "ingen adresse"}</p>
            </div>
            <AddressAutocomplete value={value} onChange={setValue} placeholder="Skriv vej og husnummer…" />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="outline" className="h-11" disabled={remaining.length < 2} onClick={() => setIdx((i) => (i + 1) % remaining.length)}>
                Spring over
              </Button>
              <Button className="h-11" disabled={!verified || saving} onClick={save}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Gem adresse{remaining.length > 1 ? " og næste" : ""}
              </Button>
            </div>
            {!verified && <p className="text-xs text-muted-foreground">Vælg en adresse fra forslagene, så den kan placeres på kortet.</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
