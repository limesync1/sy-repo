// Mobil bottom-sheet: tilføj et stop til en rute ud fra en fri adresse
// (DAWA-autocomplete, ingen API-nøgle), med start- og sluttid
// og valgfri medarbejder. Bruges når stoppet ikke kommer fra en bestilling.
import { useMemo, useState } from "react";
import { Loader2, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import AddressAutocomplete, { type AddressValue } from "@/components/shared/AddressAutocomplete";
import { useAddStop, type RouteStop } from "@/hooks/useRoutes";

const emptyAddress: AddressValue = {
  address: "",
  zip_code: "",
  city: "",
  latitude: null,
  longitude: null,
};

const minutesBetween = (start: string, end: string): number | null => {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : null;
};

export function AddAddressStopSheet({
  open,
  onOpenChange,
  routeId,
  nextSequence,
  employees,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string;
  nextSequence: number;
  employees: any[];
  onAdded?: (stop: RouteStop) => void;
}) {
  const [addr, setAddr] = useState<AddressValue>(emptyAddress);
  const [label, setLabel] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  const addStop = useAddStop();

  const activeEmployees = useMemo(
    () => (employees || []).filter((e) => e.is_active !== false),
    [employees],
  );

  const derived = minutesBetween(start, end);
  const effectiveDuration = derived ?? 30;
  const canSubmit = addr.address.trim().length > 2 && !addStop.isPending;

  const reset = () => {
    setAddr(emptyAddress);
    setLabel("");
    setPhone("");
    setNote("");
    setStart("");
    setEnd("");
    setEmployeeId(null);
  };

  const close = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const submit = async () => {
    if (!canSubmit) return;
    const fullAddress = [addr.address.trim(), [addr.zip_code, addr.city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");
    try {
      const stop = await addStop.mutateAsync({
        route_id: routeId,
        sequence: nextSequence,
        customer_name: label.trim() || addr.address.trim(),
        customer_phone: phone.trim() || null,
        address: fullAddress,
        latitude: addr.latitude ?? null,
        longitude: addr.longitude ?? null,
        service_summary: note.trim() || null,
        duration_minutes: effectiveDuration,
        time_window_start: start || null,
        time_window_end: end || null,
        assigned_employee_id: employeeId,
      });
      toast.success("Stop tilføjet til ruten", {
        description: addr.latitude
          ? undefined
          : "Adressen mangler koordinater og vises ikke på kortet.",
      });
      onAdded?.(stop as RouteStop);
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Kunne ikke tilføje stop", { description: err?.message });
    }
  };

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="bottom" className="flex max-h-[92vh] flex-col gap-0 rounded-t-lg p-0">
        <SheetHeader className="border-b border-border px-4 py-3 pr-14 text-left">
          <SheetTitle className="text-base">Tilføj stop</SheetTitle>
          <SheetDescription className="text-xs">
            Skriv en adresse og vælg tidspunkt. Stoppet lægges sidst på ruten.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Adresse
            </Label>
            <AddressAutocomplete
              value={addr}
              onChange={setAddr}
              placeholder="Fx Vistorpvej 30"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Navn på stoppet (valgfrit)
            </Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Fx Rema 1000 eller Mette Hansen"
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Starttid
              </Label>
              <Input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Sluttid
              </Label>
              <Input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Telefon (valgfrit)
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+45 22 33 44 55"
              inputMode="tel"
              className="h-11"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Note (valgfrit)
            </Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Fx afhent nøgle i receptionen"
              className="h-11"
            />
          </div>

          {activeEmployees.length > 0 && (
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Medarbejder (valgfrit)
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {activeEmployees.map((e) => {
                  const selected = employeeId === e.id;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setEmployeeId(selected ? null : e.id)}
                      className={cn(
                        "min-h-[40px] rounded-full border px-3.5 text-xs font-medium transition-colors",
                        selected
                          ? "border-accent bg-accent/10 text-foreground"
                          : "border-border bg-card text-muted-foreground",
                      )}
                    >
                      {e.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button className="h-12 w-full gap-2 text-base" onClick={submit} disabled={!canSubmit}>
            {addStop.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : addr.latitude ? (
              <Plus className="h-4 w-4" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            Tilføj til ruten
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default AddAddressStopSheet;
