// TrafficOverridesSection — administrer område-specifikke trafik-buffere
// pr. postnummer-præfiks. Ejeren kan sætte en multiplikator (fx 1.35 for
// Storkøbenhavn i myldretiden) der lægges oven på rutetjenestens grundtid.
//
// Bruges i SettingsTab → Avanceret-sektionen.
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, MapPin, Clock, Info } from "lucide-react";

type Override = {
  id: string;
  business_id: string;
  zip_prefix: string;
  label: string | null;
  multiplier: number;
  hour_start: number | null;
  hour_end: number | null;
  weekdays_only: boolean;
  is_active: boolean;
};

const PRESET_AREAS = [
  { prefix: "10", label: "København K (Indre by)", suggestion: 1.45 },
  { prefix: "20", label: "København N/S/V/Ø", suggestion: 1.35 },
  { prefix: "21", label: "Frederiksberg + omegn", suggestion: 1.30 },
  { prefix: "26", label: "Storkøbenhavn vest", suggestion: 1.25 },
  { prefix: "28", label: "Storkøbenhavn nord", suggestion: 1.25 },
  { prefix: "8000", label: "Aarhus C", suggestion: 1.30 },
  { prefix: "5000", label: "Odense C", suggestion: 1.20 },
  { prefix: "9000", label: "Aalborg C", suggestion: 1.20 },
];

export const TrafficOverridesSection = ({ businessId }: { businessId: string }) => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Override | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Override | null>(null);

  const { data: overrides = [], isLoading } = useQuery({
    queryKey: ["traffic-overrides", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("traffic_buffer_overrides")
        .select("*")
        .eq("business_id", businessId)
        .order("zip_prefix", { ascending: true });
      if (error) throw error;
      return (data || []) as Override[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: Partial<Override> & { business_id: string; zip_prefix: string }) => {
      if (payload.id) {
        const { error } = await supabase
          .from("traffic_buffer_overrides")
          .update({
            zip_prefix: payload.zip_prefix,
            label: payload.label,
            multiplier: payload.multiplier,
            hour_start: payload.hour_start,
            hour_end: payload.hour_end,
            weekdays_only: payload.weekdays_only,
            is_active: payload.is_active,
          })
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("traffic_buffer_overrides")
          .insert({
            business_id: payload.business_id,
            zip_prefix: payload.zip_prefix,
            label: payload.label ?? null,
            multiplier: payload.multiplier ?? 1.2,
            hour_start: payload.hour_start ?? null,
            hour_end: payload.hour_end ?? null,
            weekdays_only: payload.weekdays_only ?? false,
            is_active: payload.is_active ?? true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["traffic-overrides", businessId] });
      toast.success("Gemt");
      setEditing(null);
      setCreating(false);
    },
    onError: (e: any) => toast.error(e?.message || "Kunne ikke gemme"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("traffic_buffer_overrides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["traffic-overrides", businessId] });
      toast.success("Slettet");
      setConfirmDelete(null);
    },
    onError: (e: any) => toast.error(e?.message || "Kunne ikke slette"),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-accent" />
        <p className="leading-relaxed">
          Område-overrides justerer ETA pr. postnummer. Bruges når den beregnede
          køretid er for lav et bestemt sted (fx Storkøbenhavn). En
          multiplikator på <span className="font-semibold tabular-nums">1.35</span> betyder at
          grundtiden ganges med 1.35. Den længste prefix-match vinder.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-fade-in">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              <div className="h-8 w-8 rounded-md bg-muted/70 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/3 rounded bg-muted/70 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-muted/70 animate-pulse" />
              </div>
              <div className="h-7 w-16 rounded bg-muted/70 animate-pulse" />
            </div>
          ))}
        </div>
      ) : overrides.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <MapPin className="mx-auto h-6 w-6 text-muted-foreground/60" />
          <p className="mt-2 text-sm font-medium">Ingen område-overrides endnu</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tilføj én for at finjustere ETA i bestemte områder.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {overrides.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setEditing(o)}
              className="w-full text-left rounded-lg border border-border bg-card p-3 transition hover:border-accent/40 hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs">
                      {o.zip_prefix}***
                    </Badge>
                    <span className="text-sm font-semibold">
                      × {Number(o.multiplier).toFixed(2)}
                    </span>
                    {!o.is_active && (
                      <Badge variant="secondary" className="text-[10px]">Inaktiv</Badge>
                    )}
                  </div>
                  {o.label && (
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">{o.label}</p>
                  )}
                  {(o.hour_start != null || o.weekdays_only) && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {o.hour_start != null && o.hour_end != null
                        ? `kl. ${String(o.hour_start).padStart(2, "0")}–${String(o.hour_end).padStart(2, "0")}`
                        : "hele dagen"}
                      {o.weekdays_only && <span>· kun hverdage</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setCreating(true)}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        Tilføj område-override
      </Button>

      <OverrideDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        initial={editing}
        onSave={(payload) => upsert.mutate({ ...payload, business_id: businessId, id: editing?.id })}
        onDelete={editing ? () => setConfirmDelete(editing) : undefined}
        saving={upsert.isPending}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slet område-override?</AlertDialogTitle>
            <AlertDialogDescription>
              ETA i postnumre der starter med "{confirmDelete?.zip_prefix}" går
              tilbage til standard-bufferen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annullér</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && remove.mutate(confirmDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Slet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* ── Dialog til at oprette/redigere ─────────────────────────── */
const OverrideDialog = ({
  open, onOpenChange, initial, onSave, onDelete, saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Override | null;
  onSave: (payload: Partial<Override> & { zip_prefix: string }) => void;
  onDelete?: () => void;
  saving: boolean;
}) => {
  const [zip, setZip] = useState("");
  const [label, setLabel] = useState("");
  const [multiplier, setMultiplier] = useState(1.25);
  const [hourStart, setHourStart] = useState<string>("");
  const [hourEnd, setHourEnd] = useState<string>("");
  const [weekdaysOnly, setWeekdaysOnly] = useState(false);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (open) {
      setZip(initial?.zip_prefix || "");
      setLabel(initial?.label || "");
      setMultiplier(Number(initial?.multiplier ?? 1.25));
      setHourStart(initial?.hour_start != null ? String(initial.hour_start) : "");
      setHourEnd(initial?.hour_end != null ? String(initial.hour_end) : "");
      setWeekdaysOnly(!!initial?.weekdays_only);
      setActive(initial?.is_active ?? true);
    }
  }, [open, initial?.id]);

  const validZip = useMemo(() => /^\d{1,4}$/.test(zip), [zip]);
  const validHours = useMemo(() => {
    if (!hourStart && !hourEnd) return true;
    const s = Number(hourStart), e = Number(hourEnd);
    return Number.isFinite(s) && Number.isFinite(e) && s >= 0 && s < 24 && e > s && e <= 24;
  }, [hourStart, hourEnd]);

  const canSave = validZip && validHours && multiplier >= 0.5 && multiplier <= 3;

  const handlePreset = (p: typeof PRESET_AREAS[number]) => {
    setZip(p.prefix);
    setLabel(p.label);
    setMultiplier(p.suggestion);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Rediger override" : "Nyt område-override"}</DialogTitle>
          <DialogDescription>
            ETA for stop i dette område multipliceres med din valgte faktor.
          </DialogDescription>
        </DialogHeader>

        {!initial && (
          <div className="space-y-1.5">
            <Label className="text-xs">Hurtigvalg (DK)</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_AREAS.map((p) => (
                <button
                  key={p.prefix}
                  type="button"
                  onClick={() => handlePreset(p)}
                  className="rounded-full border border-border px-2.5 py-1 text-[11px] hover:bg-accent/10 hover:border-accent/40 transition"
                >
                  {p.prefix} · {p.label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="zip-prefix" className="text-xs">Postnr-præfiks</Label>
            <Input
              id="zip-prefix"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="fx 21 eller 8000"
              className="font-mono"
              inputMode="numeric"
            />
            <p className="text-[10px] text-muted-foreground">1–4 cifre. "21" rammer alle 21xx.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="multiplier" className="text-xs">Multiplikator</Label>
            <Input
              id="multiplier"
              type="number"
              step="0.05"
              min={0.5}
              max={3}
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              className="tabular-nums"
            />
            <p className="text-[10px] text-muted-foreground">
              {multiplier >= 1
                ? `+${Math.round((multiplier - 1) * 100)}% ekstra tid`
                : `${Math.round((multiplier - 1) * 100)}% mindre tid`}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="label" className="text-xs">Beskrivelse (valgfri)</Label>
          <Input
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="fx Indre København i myldretid"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Fra (kl.)</Label>
            <Select value={hourStart || "any"} onValueChange={(v) => setHourStart(v === "any" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Hele dagen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Hele dagen</SelectItem>
                {Array.from({ length: 24 }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>{String(i).padStart(2, "0")}:00</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Til (kl.)</Label>
            <Select
              value={hourEnd || "any"}
              onValueChange={(v) => setHourEnd(v === "any" ? "" : v)}
              disabled={!hourStart}
            >
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">—</SelectItem>
                {Array.from({ length: 24 }, (_, i) => i + 1).map((i) => (
                  <SelectItem key={i} value={String(i)}>{String(i).padStart(2, "0")}:00</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {!validHours && (
          <p className="text-[11px] text-destructive">"Til" skal være efter "Fra".</p>
        )}

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">Kun hverdage</p>
            <p className="text-[11px] text-muted-foreground">Ignorer i weekenden.</p>
          </div>
          <Switch checked={weekdaysOnly} onCheckedChange={setWeekdaysOnly} />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">Aktiv</p>
            <p className="text-[11px] text-muted-foreground">Slå fra for midlertidigt at deaktivere.</p>
          </div>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {onDelete ? (
            <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-1.5" /> Slet
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annullér</Button>
            <Button
              disabled={!canSave || saving}
              onClick={() => onSave({
                zip_prefix: zip,
                label: label.trim() || null,
                multiplier,
                hour_start: hourStart ? Number(hourStart) : null,
                hour_end: hourEnd ? Number(hourEnd) : null,
                weekdays_only: weekdaysOnly,
                is_active: active,
              })}
            >
              {saving ? "Gemmer..." : "Gem"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};