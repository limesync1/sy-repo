// AllUnassignedDialog — viser ALLE aftaler uden rute (uden filter/dato-vindue)
// så man fx kan justere `preferred_date` på en aftale der ligger langt ude
// i fremtiden uden først at scrolle kalenderen derhen.

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Calendar as CalIcon, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

type Job = {
  id: string;
  customer_name: string | null;
  total_amount: number;
  preferred_date: string | null;
  next_service_date: string | null;
  city?: string | null;
};

export const AllUnassignedDialog = ({
  open, onOpenChange, jobs,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  jobs: Job[];
}) => {
  const qc = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = jobs.filter((j) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (j.customer_name || "").toLowerCase().includes(q)
      || (j.city || "").toLowerCase().includes(q);
  });

  const updateDate = async (id: string, date: string) => {
    setSavingId(id);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ preferred_date: date || null })
        .eq("id", id);
      if (error) throw error;
      toast.success("Opstartsdato opdateret");
      qc.invalidateQueries({ queryKey: ["unassigned-jobs"] });
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke opdatere dato");
    } finally {
      setSavingId(null);
    }
  };

  const fmt = (d: string | null) => {
    if (!d) return "—";
    try { return format(parseISO(d.slice(0, 10)), "d. MMM yyyy", { locale: da }); }
    catch { return d; }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="text-base sm:text-lg">Alle aftaler uden rute ({jobs.length})</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Justér opstartsdato direkte her — eller luk og træk aftalen ind på en dag i kalenderen.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Søg navn eller by..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 text-sm"
        />

        <div className="max-h-[60vh] overflow-y-auto -mx-2">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <Search className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">Ingen aftaler matcher</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {search ? "Prøv et andet søgeord." : "Der er ingen aftaler uden rute lige nu."}
              </p>
            </div>
          )}
          <div className="divide-y">
            {filtered.map((j) => {
              const current = j.preferred_date || j.next_service_date || "";
              return (
                <div key={j.id} className="flex flex-col gap-2 px-2 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${j.customer_name ? "font-medium" : "font-medium text-muted-foreground italic"}`}>
                      {j.customer_name || "Ukendt kunde"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {j.city || "—"} · {Math.round(j.total_amount || 0).toLocaleString("da-DK")} kr · ønsket {fmt(current)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 sm:shrink-0">
                    <CalIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Input
                      type="date"
                      defaultValue={current ? current.slice(0, 10) : ""}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (v !== (current ? current.slice(0, 10) : "")) updateDate(j.id, v);
                      }}
                      className="h-9 text-sm flex-1 sm:h-8 sm:w-[160px] sm:flex-none"
                      disabled={savingId === j.id}
                    />
                    {savingId === j.id && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Luk</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};