import { useEffect, useRef, useState } from "react";
import { Settings2, X, Loader2, Check, Plus, Mail, Users, BriefcaseBusiness, MapPin, MessageSquare } from "lucide-react";
import { Slider } from "@/components/ui/slider";
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

const DISTANCE_PRESETS = [
  { label: "Lokalt", hint: "15 km", km: 15 },
  { label: "Nærområde", hint: "30 km", km: 30 },
  { label: "Landsdel", hint: "60 km", km: 60 },
  { label: "Region", hint: "100 km", km: 100 },
  { label: "Hele landet", hint: "Ingen grænse", km: null as number | null },
];

const REPLY_TEMPLATES = [
  { label: "Kort", text: DEFAULT_REPLY },
  { label: "Med tidsramme", text: "Tak for din forespørgsel om {{service}}! Vi har modtaget den {{tidspunkt}} og sender dig et tilbud inden for 24 timer på hverdage." },
  { label: "Personlig", text: "Tak fordi du kontaktede {{firmanavn}} om {{service}} i {{by}}. Vi kigger på din opgave i dag og ringer dig op, hvis vi har spørgsmål, inden vi sender et tilbud." },
];

/** Felter der udfyldes automatisk — samme navne som i kunde-notifikationerne. */
const REPLY_VARIABLES = [
  { token: "{{kundens_navn}}", label: "Kundens navn", example: "Mette Hansen" },
  { token: "{{service}}", label: "Service", example: "Vinduespudsning" },
  { token: "{{tidspunkt}}", label: "Tidspunkt", example: "2. okt. kl. 09:30" },
  { token: "{{by}}", label: "By", example: "Odense C" },
  { token: "{{pris}}", label: "Vejledende pris", example: "ca. 450 kr." },
  { token: "{{firmanavn}}", label: "Firmanavn", example: "Jeres virksomhed" },
];

const fillReplyPreview = (text: string, businessName?: string) =>
  REPLY_VARIABLES.reduce((t, v) => t.split(v.token).join(v.token === "{{firmanavn}}" ? (businessName || v.example) : v.example), text);

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
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [ownCategories, setOwnCategories] = useState<string[]>([]);
  const [staff, setStaff] = useState<{ name: string; email: string }[]>([]);
  const [raw, setRaw] = useState<Record<string, unknown>>({});
  const [s, setS] = useState<LeadSettings>({
    lead_emails: true, lead_recipients: [], lead_categories: [], lead_max_km: null,
    lead_auto_reply: false, lead_auto_reply_text: DEFAULT_REPLY,
  });

  useEffect(() => {
    if (!open || !businessId) return;
    setLoading(true);
    void Promise.all([
      supabase.from("services").select("service_category, subcategory, name").eq("business_id", businessId).eq("is_active", true),
      supabase.from("employees").select("name, email").eq("business_id", businessId).eq("is_active", true),
    ]).then(([sv, em]) => {
      const cats = new Set<string>();
      (sv.data ?? []).forEach((r) => { const c = r.service_category || r.subcategory || r.name; if (c) cats.add(c); });
      setOwnCategories([...cats].sort((a, b) => a.localeCompare(b, "da")));
      setStaff((em.data ?? []).filter((e) => e.email).map((e) => ({ name: e.name, email: e.email as string })));
    });
    supabase.from("businesses").select("name, email, notification_settings").eq("id", businessId).maybeSingle()
      .then(({ data }) => {
        setBusinessName(data?.name ?? "");
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
      <DialogContent className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-5 pb-5 pt-6 sm:px-7">
          <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-foreground"><Settings2 className="h-5 w-5" /></span>
          <DialogTitle className="text-xl sm:text-2xl">Lead-indstillinger</DialogTitle>
          <DialogDescription>Styr hvilke leads du modtager, og hvem der får besked.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-6 px-5 py-5 sm:px-7">
            <section className="space-y-3">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Beskeder om nye leads</h3></div>
              <div className="flex items-start justify-between gap-4 rounded-md border border-border bg-card p-4">
              <div>
                <Label>E-mail ved ny lead</Label>
                <p className="text-xs text-muted-foreground">Sendes til {ownerEmail || "virksomhedens e-mail"} når en ny lead kommer ind.</p>
              </div>
              <Switch checked={s.lead_emails} onCheckedChange={(v) => setS({ ...s, lead_emails: v })} />
              </div>

              <div className="space-y-2 rounded-md border border-border bg-card p-4">
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><Label>Ekstra modtagere</Label></div>
              <p className="text-xs text-muted-foreground">Vælg medarbejdere eller tilføj e-mails. Du kan vælge op til 5.</p>
              {staff.filter((m) => m.email !== ownerEmail).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {staff.filter((m) => m.email !== ownerEmail).map((m) => {
                    const on = s.lead_recipients.includes(m.email);
                    return (
                      <Button key={m.email} type="button" aria-pressed={on} variant={on ? "default" : "outline"} size="sm"
                        onClick={() => setS({ ...s, lead_recipients: on ? s.lead_recipients.filter((x) => x !== m.email) : [...s.lead_recipients, m.email].slice(0, 5) })}
                        className="h-9 gap-1.5 text-xs">
                        {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}{m.name}
                      </Button>
                    );
                  })}
                </div>
              )}
              <ChipInput values={s.lead_recipients} validate={emailOk} placeholder="anden@firma.dk"
                onChange={(v) => setS({ ...s, lead_recipients: v.slice(0, 5) })} />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Hvilke leads vil du modtage?</h3></div>
              <div className="space-y-2 rounded-md border border-border bg-card p-4">
              <Label>Brancher</Label>
              <p className="text-xs text-muted-foreground">
                {ownCategories.length ? "Foreslået ud fra jeres egne services. Tryk for at slå til eller fra. Ingen valgt = alle jeres brancher." : "Opret services, så foreslår vi automatisk jeres brancher."}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[...new Set([...ownCategories, ...s.lead_categories])].map((c) => {
                  const on = s.lead_categories.length === 0 || s.lead_categories.includes(c);
                  return (
                    <Button key={c} type="button" aria-pressed={on} variant={on ? "default" : "outline"} size="sm"
                      onClick={() => {
                        const base = s.lead_categories.length === 0 ? [...ownCategories] : s.lead_categories;
                        const next = on ? base.filter((x) => x !== c) : [...base, c];
                        setS({ ...s, lead_categories: next.length === ownCategories.length && ownCategories.every((x) => next.includes(x)) ? [] : next });
                      }}
                      className="h-9 gap-1.5 text-xs">
                      {on ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}{c}
                    </Button>
                  );
                })}
              </div>
              </div>

              <div className="space-y-3 rounded-md border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><Label>Maks. afstand</Label></div>
                <span className="text-sm font-semibold tabular-nums">{s.lead_max_km ? `${s.lead_max_km} km` : "Hele landet"}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                {DISTANCE_PRESETS.map((p) => (
                  <Button key={p.label} type="button" variant={s.lead_max_km === p.km ? "default" : "outline"} onClick={() => setS({ ...s, lead_max_km: p.km })}
                    className="h-auto min-h-11 justify-start px-2 py-1.5 text-left text-xs">
                    <span className="block font-semibold">{p.label}</span>
                    <span className="block opacity-75">{p.hint}</span>
                  </Button>
                ))}
              </div>
              <Slider min={5} max={200} step={5} value={[s.lead_max_km ?? 200]}
                onValueChange={([v]) => setS({ ...s, lead_max_km: v >= 200 ? null : v })} aria-label="Maks. afstand i km" />
              </div>
            </section>

            <section className="space-y-3 rounded-md border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-muted-foreground" /><Label>Automatisk svar til kunden</Label></div>
                  <p className="mt-1 text-xs text-muted-foreground">Send din valgte besked med det samme, når et nyt lead kommer ind.</p>
                </div>
                <Switch checked={s.lead_auto_reply} onCheckedChange={(v) => setS({ ...s, lead_auto_reply: v })} />
              </div>
              {s.lead_auto_reply && (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {REPLY_TEMPLATES.map((tpl) => (
                      <Button key={tpl.label} type="button" size="sm" variant={s.lead_auto_reply_text === tpl.text ? "default" : "outline"} className="h-8 text-xs"
                        onClick={() => setS({ ...s, lead_auto_reply_text: tpl.text })}>{tpl.label}</Button>
                    ))}
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs text-muted-foreground">Indsæt felter, der automatisk udfyldes for hver kunde:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {REPLY_VARIABLES.map((v) => (
                        <button key={v.token} type="button" title={`Eksempel: ${v.example}`}
                          onClick={() => {
                            const el = replyRef.current;
                            const text = s.lead_auto_reply_text;
                            const pos = el ? el.selectionStart : text.length;
                            const next = (text.slice(0, pos) + v.token + text.slice(pos)).slice(0, 1000);
                            setS({ ...s, lead_auto_reply_text: next });
                            requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(pos + v.token.length, pos + v.token.length); });
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground transition-colors hover:border-foreground/30 hover:bg-secondary">
                          <Plus className="h-3 w-3 text-muted-foreground" />{v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Textarea ref={replyRef} rows={5} maxLength={1000} value={s.lead_auto_reply_text}
                    onChange={(e) => setS({ ...s, lead_auto_reply_text: e.target.value })} />
                  <div className="rounded-md bg-secondary/50 p-3 text-xs">
                    <p className="mb-1 font-semibold text-foreground">Sådan ser kunden den</p>
                    <p className="text-muted-foreground">Fra: {businessName || "Jeres virksomhed"}</p>
                    <p className="mt-2 whitespace-pre-line text-foreground">{`Hej Mette Hansen,\n\n${fillReplyPreview(s.lead_auto_reply_text, businessName)}\n\nForespørgsel: Vinduespudsning\nStatus: Modtaget\n\nVenlig hilsen\n${businessName || "Jeres virksomhed"}`}</p>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
        <DialogFooter className="gap-2 border-t border-border bg-secondary/30 px-5 py-4 sm:px-7">
          <Button variant="outline" onClick={() => setOpen(false)}>Annuller</Button>
          <Button onClick={save} disabled={saving || loading}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Gem</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LeadSettingsDialog;
