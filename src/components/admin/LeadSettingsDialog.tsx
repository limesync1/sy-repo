import { useEffect, useState } from "react";
import { Settings2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

/** Lead-indstillinger gemmes i businesses.notification_settings (jsonb) og læses af match-quotes. */
type LeadSettings = {
  lead_emails: boolean;
  lead_recipients: string[];
  lead_categories: string[];
  lead_max_km: number | null;
  lead_auto_reply: boolean;
  lead_auto_reply_text: string;
};

const DEFAULT_REPLY =
  "Tak for din forespørgsel! Vi har modtaget din opgave og vender tilbage hurtigst muligt med et tilbud.";

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function ChipInput({ values, onChange, placeholder, validate }: {
  values: string[]; onChange: (v: string[]) => void; placeholder: string; validate?: (v: string) => boolean;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (validate && !validate(v)) { toast.error("Ugyldig værdi"); return; }
    if (!values.includes(v)) onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <Button type="button" variant="outline" onClick={add}>Tilføj</Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-[5px] border border-border bg-secondary px-2 py-1 text-xs">
              {v}
              <button type="button" aria-label={`Fjern ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function LeadSettingsDialog({ businessId }: { businessId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [raw, setRaw] = useState<Record<string, unknown>>({});
  const [s, setS] = useState<LeadSettings>({
    lead_emails: true, lead_recipients: [], lead_categories: [], lead_max_km: null,
    lead_auto_reply: false, lead_auto_reply_text: DEFAULT_REPLY,
  });

  useEffect(() => {
    if (!open || !businessId) return;
    setLoading(true);
    supabase.from("businesses").select("email, notification_settings").eq("id", businessId).maybeSingle()
      .then(({ data }) => {
        const ns = ((data?.notification_settings as Record<string, unknown>) ?? {});
        setRaw(ns);
        setOwnerEmail(data?.email ?? null);
        setS({
          lead_emails: ns.lead_emails !== false,
          lead_recipients: Array.isArray(ns.lead_recipients) ? (ns.lead_recipients as string[]) : [],
          lead_categories: Array.isArray(ns.lead_categories) ? (ns.lead_categories as string[]) : [],
          lead_max_km: typeof ns.lead_max_km === "number" ? ns.lead_max_km : null,
          lead_auto_reply: ns.lead_auto_reply === true,
          lead_auto_reply_text: typeof ns.lead_auto_reply_text === "string" ? ns.lead_auto_reply_text : DEFAULT_REPLY,
        });
        setLoading(false);
      });
  }, [open, businessId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("businesses")
      .update({ notification_settings: { ...raw, ...s } as never })
      .eq("id", businessId);
    setSaving(false);
    if (error) { toast.error("Kunne ikke gemme indstillinger"); return; }
    toast.success("Lead-indstillinger gemt");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2"><Settings2 className="h-4 w-4" />Indstillinger</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Lead-indstillinger</DialogTitle>
          <DialogDescription>Styr hvilke leads du modtager, og hvem der får besked.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
              <div>
                <Label>E-mail ved ny lead</Label>
                <p className="text-xs text-muted-foreground">Sendes til {ownerEmail || "virksomhedens e-mail"} når en ny lead kommer ind.</p>
              </div>
              <Switch checked={s.lead_emails} onCheckedChange={(v) => setS({ ...s, lead_emails: v })} />
            </div>

            <div className="space-y-2">
              <Label>Ekstra modtagere</Label>
              <p className="text-xs text-muted-foreground">Virksomhedens e-mail får altid besked. Tilføj fx en kollega.</p>
              <ChipInput values={s.lead_recipients} validate={emailOk} placeholder="navn@firma.dk"
                onChange={(v) => setS({ ...s, lead_recipients: v.slice(0, 5) })} />
            </div>

            <div className="space-y-2">
              <Label>Brancher</Label>
              <p className="text-xs text-muted-foreground">Tom liste = alle brancher du tilbyder.</p>
              <ChipInput values={s.lead_categories} placeholder="fx Haveservice"
                onChange={(v) => setS({ ...s, lead_categories: v })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-km">Maks. afstand (km)</Label>
              <Input id="lead-km" type="number" min={1} max={500} placeholder="Ingen grænse"
                value={s.lead_max_km ?? ""}
                onChange={(e) => setS({ ...s, lead_max_km: e.target.value ? Math.max(1, Number(e.target.value)) : null })} />
            </div>

            <div className="space-y-3 rounded-md border border-border p-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label>Auto-svar til kunden</Label>
                  <p className="text-xs text-muted-foreground">Kunden får straks en bekræftelse fra jer.</p>
                </div>
                <Switch checked={s.lead_auto_reply} onCheckedChange={(v) => setS({ ...s, lead_auto_reply: v })} />
              </div>
              {s.lead_auto_reply && (
                <Textarea rows={4} maxLength={1000} value={s.lead_auto_reply_text}
                  onChange={(e) => setS({ ...s, lead_auto_reply_text: e.target.value })} />
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuller</Button>
          <Button onClick={save} disabled={saving || loading}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Gem</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LeadSettingsDialog;
