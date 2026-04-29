import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Sparkles, Mail, Phone, MapPin, Brain, Loader2, Send, RefreshCw, Save,
  StickyNote, Bell, Trophy, XCircle, Clock, Copy, Check, CalendarIcon,
  Sunrise, Sun, Sunset, Moon, CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format, isSameDay, addDays, addHours, isBefore, startOfDay } from "date-fns";
import { da } from "date-fns/locale";
import { InlineTextSkeleton } from "@/components/admin/shared/Skeletons";

export type LeadDetailLead = {
  id: string;
  match_score: number;
  reason: string | null;
  estimated_price: string | null;
  distance_km: number | null;
  status: string;
  business_note: string | null;
  ai_draft: string | null;
  ai_draft_generated_at: string | null;
  follow_up_at: string | null;
  created_at: string;
  quote_request: {
    id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    category: string;
    description: string;
    city: string | null;
    zip_code: string | null;
    share_contact: boolean;
    created_at: string;
  } | null;
};

type Props = {
  lead: LeadDetailLead | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChange: (lead: LeadDetailLead) => void;
};

const TONES = [
  { value: "professionel", label: "Professionel" },
  { value: "venlig",       label: "Venlig" },
  { value: "kort",         label: "Kort" },
  { value: "detaljeret",   label: "Detaljeret (stiller spørgsmål)" },
];

/* ─── Helpers til lokal datetime-streng ("YYYY-MM-DDTHH:mm") som vi bruger
 * i stedet for Date for at undgå tidszone-overraskelser når brugeren vælger
 * tidspunkter. Konverterer mellem string ↔ Date efter behov. */
const toLocalString = (d: Date) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const parseLocalString = (s: string): Date | null => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

/* ─── FollowUpEditor — moderne påmindelses-vælger med kalender + tids-slots.
 * Erstatter den rå <input type="datetime-local"> med en visuelt rig flow:
 *  1) Hurtig-presets (Om 1 time, I morgen kl. 9 osv.) — store, klikbare kort
 *  2) Visuel kalender (shadcn) til at vælge dato
 *  3) Tidsbånd opdelt i Morgen/Eftermiddag/Aften med hopla-slots
 *  4) Tydelig "Aktuel påmindelse"-banner med fjern-knap
 * Animationerne er holdt subtile: fade-in + slide ved valg, scale-pop på slot-klik. */
const FollowUpEditor = ({
  value, onChange, onSave, saving, currentSavedIso,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void | Promise<void>;
  saving: boolean;
  currentSavedIso: string | null;
}) => {
  const selectedDate = parseLocalString(value);
  const today = startOfDay(new Date());

  const setDateKeepingTime = (date: Date | undefined) => {
    if (!date) return;
    const base = selectedDate ?? new Date();
    const merged = new Date(date);
    merged.setHours(base.getHours() || 9, base.getMinutes() || 0, 0, 0);
    onChange(toLocalString(merged));
  };

  const setTime = (h: number, m = 0) => {
    const base = selectedDate ?? new Date();
    // Hvis ingen dato valgt og tiden er passeret i dag, ryk til i morgen
    const candidate = new Date(base);
    candidate.setHours(h, m, 0, 0);
    if (!selectedDate && isBefore(candidate, new Date())) {
      candidate.setDate(candidate.getDate() + 1);
    }
    onChange(toLocalString(candidate));
  };

  const presets = [
    {
      label: "Om 1 time",
      sub: () => format(addHours(new Date(), 1), "HH:mm", { locale: da }),
      icon: Clock,
      apply: () => onChange(toLocalString(addHours(new Date(), 1))),
    },
    {
      label: "Om 4 timer",
      sub: () => format(addHours(new Date(), 4), "HH:mm", { locale: da }),
      icon: Clock,
      apply: () => onChange(toLocalString(addHours(new Date(), 4))),
    },
    {
      label: "I morgen kl. 9",
      sub: () => format(addDays(new Date(), 1), "EEEE", { locale: da }),
      icon: Sunrise,
      apply: () => {
        const d = addDays(new Date(), 1);
        d.setHours(9, 0, 0, 0);
        onChange(toLocalString(d));
      },
    },
    {
      label: "Om 3 dage",
      sub: () => format(addDays(new Date(), 3), "EEEE d. MMM", { locale: da }),
      icon: CalendarClock,
      apply: () => {
        const d = addDays(new Date(), 3);
        d.setHours(9, 0, 0, 0);
        onChange(toLocalString(d));
      },
    },
    {
      label: "Om en uge",
      sub: () => format(addDays(new Date(), 7), "EEEE d. MMM", { locale: da }),
      icon: CalendarClock,
      apply: () => {
        const d = addDays(new Date(), 7);
        d.setHours(9, 0, 0, 0);
        onChange(toLocalString(d));
      },
    },
  ];

  const timeBands: { label: string; icon: any; slots: { h: number; m?: number }[] }[] = [
    { label: "Morgen",     icon: Sunrise, slots: [{ h: 8 }, { h: 9 }, { h: 10 }, { h: 11 }] },
    { label: "Eftermiddag",icon: Sun,     slots: [{ h: 12 }, { h: 13 }, { h: 14 }, { h: 15 }, { h: 16 }] },
    { label: "Aften",      icon: Sunset,  slots: [{ h: 17 }, { h: 18 }, { h: 19 }, { h: 20 }] },
  ];

  const isSlotActive = (h: number, m = 0) =>
    selectedDate?.getHours() === h && (selectedDate?.getMinutes() ?? 0) === m;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Vælg hvornår I vil mindes om at følge op. Påmindelsen vises øverst på leads-siden, når tiden er inde.
      </p>

      {/* Aktuel påmindelse — fremhæver det valgte tidspunkt. Kun farve-overgang
          ved tilstandsskift, ingen pop/scale (det signalerede fejlagtigt at
          en handling var blevet udført). */}
      <div
        className={cn(
          "rounded-xl border p-4 transition-colors duration-200 ease-out",
          selectedDate
            ? "border-accent/30 bg-accent/5"
            : "border-dashed border-border bg-secondary/40",
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
              selectedDate ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground",
            )}
          >
            <Bell className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Påmindelse
            </p>
            {selectedDate ? (
              <p className="text-sm font-semibold text-foreground">
                {format(selectedDate, "EEEE d. MMMM 'kl.' HH:mm", { locale: da })}
                <span className="ml-2 font-normal text-muted-foreground">
                  ({formatDistanceToNow(selectedDate, { addSuffix: true, locale: da })})
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Ingen påmindelse valgt endnu</p>
            )}
          </div>
          {value && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onChange("")}
              className="gap-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <XCircle className="h-4 w-4" /> Ryd
            </Button>
          )}
        </div>
      </div>

      {/* Hurtig-presets — store kort med ikon, label og forhåndsvisning. */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Hurtige valg
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {presets.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.label}
                type="button"
                onClick={p.apply}
                className="group flex flex-col items-start gap-1 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors duration-150 ease-out hover:border-accent/40 hover:bg-accent/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-accent" />
                <span className="text-xs font-semibold text-foreground">{p.label}</span>
                <span className="text-[10px] text-muted-foreground">{p.sub()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kalender + tidsbånd side om side på desktop, stablet på mobil. */}
      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <div className="rounded-xl border border-border bg-card p-1 shadow-sm">
          <Calendar
            mode="single"
            selected={selectedDate ?? undefined}
            onSelect={setDateKeepingTime}
            disabled={(d) => isBefore(d, today)}
            initialFocus
            locale={da}
            className="p-3 pointer-events-auto"
          />
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Vælg tidspunkt</p>
            </div>
            {selectedDate && (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {format(selectedDate, "EEEE d. MMM", { locale: da })}
              </span>
            )}
          </div>

          {timeBands.map((band) => {
            const Icon = band.icon;
            return (
              <div key={band.label}>
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  {band.label}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {band.slots.map((s) => {
                    const active = isSlotActive(s.h, s.m ?? 0);
                    return (
                      <button
                        key={`${band.label}-${s.h}-${s.m ?? 0}`}
                        type="button"
                        onClick={() => setTime(s.h, s.m ?? 0)}
                        className={cn(
                          "min-w-[58px] rounded-md border px-2.5 py-1.5 text-xs font-medium tabular-nums transition-colors duration-150 ease-out",
                          active
                            ? "border-accent bg-accent text-accent-foreground shadow-sm"
                            : "border-border bg-card text-foreground hover:border-accent/40 hover:bg-accent/5",
                        )}
                      >
                        {String(s.h).padStart(2, "0")}:{String(s.m ?? 0).padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Manuel finjustering — for præcise tider udenfor slots. */}
          <div className="flex items-center gap-2 border-t border-border pt-3">
            <Moon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Andet tidspunkt:</span>
            <Input
              type="time"
              value={selectedDate ? format(selectedDate, "HH:mm") : ""}
              onChange={(e) => {
                const [h, m] = e.target.value.split(":").map(Number);
                if (!isNaN(h) && !isNaN(m)) setTime(h, m);
              }}
              className="h-8 w-[110px] text-xs"
            />
          </div>
        </div>
      </div>

      {/* Gem-knap nederst — tydeligt CTA. */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <p className="text-xs text-muted-foreground">
          {currentSavedIso
            ? `Gemt: ${new Date(currentSavedIso).toLocaleString("da-DK")}`
            : "Endnu ikke gemt"}
        </p>
        <Button
          onClick={() => onSave()}
          disabled={saving}
          className="gap-1.5"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          Gem påmindelse
        </Button>
      </div>
    </div>
  );
};

export const LeadDetailDialog = ({ lead, open, onOpenChange, onChange }: Props) => {
  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");
  const [tone, setTone] = useState("professionel");
  const [followUp, setFollowUp] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!lead) return;
    setDraft(lead.ai_draft || "");
    setSubject(lead.quote_request ? `Tilbud på ${lead.quote_request.category}` : "");
    setNote(lead.business_note || "");
    setFollowUp(lead.follow_up_at ? lead.follow_up_at.slice(0, 16) : "");
    setCopied(false);
  }, [lead?.id]);

  const generateDraft = async (silent = false) => {
    if (!lead) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-lead-reply", {
        body: { matchId: lead.id, tone },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const d = (data as any)?.draft || "";
      const s = (data as any)?.subject || "";
      setDraft(d);
      if (s) setSubject(s);
      onChange({ ...lead, ai_draft: d, ai_draft_generated_at: new Date().toISOString() });
      if (!silent) toast.success("AI-udkast klar");
    } catch (e: any) {
      if (!silent) toast.error(e?.message || "Kunne ikke generere udkast");
    } finally {
      setGenerating(false);
    }
  };

  // Auto-generér første udkast når dialogen åbnes hvis intet findes endnu
  useEffect(() => {
    if (open && lead && !lead.ai_draft && !generating && lead.quote_request?.description) {
      generateDraft(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id]);

  if (!lead) return null;
  const qr = lead.quote_request;

  const saveNote = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("quote_request_matches")
      .update({ business_note: note || null })
      .eq("id", lead.id);
    setSaving(false);
    if (error) { toast.error("Kunne ikke gemme note"); return; }
    onChange({ ...lead, business_note: note || null });
    toast.success("Note gemt");
  };

  const saveFollowUp = async () => {
    setSaving(true);
    const iso = followUp ? new Date(followUp).toISOString() : null;
    const { error } = await supabase
      .from("quote_request_matches")
      .update({ follow_up_at: iso })
      .eq("id", lead.id);
    setSaving(false);
    if (error) { toast.error("Kunne ikke gemme påmindelse"); return; }
    onChange({ ...lead, follow_up_at: iso });
    toast.success(iso ? "Påmindelse sat" : "Påmindelse fjernet");
  };

  const saveDraft = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("quote_request_matches")
      .update({ ai_draft: draft || null })
      .eq("id", lead.id);
    setSaving(false);
    if (error) { toast.error("Kunne ikke gemme"); return; }
    onChange({ ...lead, ai_draft: draft || null });
    toast.success("Udkast gemt");
  };

  const copyDraft = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toast.success("Kopieret");
  };

  const sendDraftAsEmail = async () => {
    if (!qr?.customer_email) { toast.error("Ingen e-mail på kunden"); return; }
    if (!draft.trim()) { toast.error("Skriv eller generer et udkast først"); return; }
    const subj = subject.trim() || `Tilbud på ${qr.category}`;
    const url = `mailto:${qr.customer_email}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(draft)}`;
    // Save draft + mark contacted
    await supabase
      .from("quote_request_matches")
      .update({
        ai_draft: draft || null,
        status: lead.status === "won" ? "won" : "contacted",
        responded_at: new Date().toISOString(),
      })
      .eq("id", lead.id);
    onChange({ ...lead, ai_draft: draft, status: lead.status === "won" ? "won" : "contacted" });
    window.location.href = url;
  };

  const updateStatus = async (status: string) => {
    const { error } = await supabase
      .from("quote_request_matches")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", lead.id);
    if (error) { toast.error("Kunne ikke opdatere"); return; }
    onChange({ ...lead, status });
    toast.success("Status opdateret");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {qr?.customer_name || "Anonym kunde"}
            <Badge variant="outline" className="gap-1 rounded-md pointer-events-none">
              <Sparkles className="h-3 w-3" /> {lead.match_score}/100
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {qr?.category} · {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: da })}
          </DialogDescription>
        </DialogHeader>

        {/* Customer info */}
        <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm">
          {qr?.description && <p className="whitespace-pre-wrap text-foreground/90">{qr.description}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {(qr?.zip_code || qr?.city) && (
              <span className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {[qr?.zip_code, qr?.city].filter(Boolean).join(" ")}
                {typeof lead.distance_km === "number" && ` • ~${Math.round(lead.distance_km)} km`}
              </span>
            )}
            {qr?.share_contact && qr.customer_email && (
              <a href={`mailto:${qr.customer_email}`} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground hover:bg-secondary">
                <Mail className="h-3.5 w-3.5" /> {qr.customer_email}
              </a>
            )}
            {qr?.share_contact && qr?.customer_phone && (
              <a href={`tel:${qr.customer_phone}`} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground hover:bg-secondary">
                <Phone className="h-3.5 w-3.5" /> {qr.customer_phone}
              </a>
            )}
          </div>
        </div>

        <Tabs defaultValue="reply" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reply" className="gap-1.5"><Brain className="h-3.5 w-3.5" /> Svar kunden</TabsTrigger>
            <TabsTrigger value="note" className="gap-1.5"><StickyNote className="h-3.5 w-3.5" /> Note</TabsTrigger>
            <TabsTrigger value="followup" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Opfølg</TabsTrigger>
          </TabsList>

          {/* AI reply tab */}
          <TabsContent value="reply" className="space-y-3">
            <div className="rounded-lg border border-border bg-secondary/40 p-3 text-xs leading-5 text-muted-foreground">
              <p className="text-foreground font-semibold mb-1 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-accent" /> Sådan virker det
              </p>
              Vælg en tone, og få automatisk skrevet et personligt svar baseret på kundens forespørgsel. Du kan altid redigere teksten, før du sender den som mail eller kopierer den.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="h-9 w-[220px] text-xs"><SelectValue placeholder="Vælg tone" /></SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => generateDraft(false)} disabled={generating} className="gap-1.5">
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {draft ? "Skriv nyt forslag" : "Skriv forslag"}
              </Button>
              {lead.ai_draft_generated_at && (
                <span className="text-[11px] text-muted-foreground">
                  Sidst genereret {formatDistanceToNow(new Date(lead.ai_draft_generated_at), { addSuffix: true, locale: da })}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Emnelinje</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Emne på e-mailen"
                className="h-9 text-sm"
              />
            </div>

            {generating && !draft ? (
              <div className="rounded-md border border-dashed border-border bg-secondary/40 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  AI skriver et personligt udkast baseret på forespørgslen…
                </div>
                {/* Skeleton-linjer i stedet for tom textarea, så det føles
                    som om svaret allerede er ved at "lande". */}
                <InlineTextSkeleton lines={6} />
              </div>
            ) : (
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Klik 'Generer udkast' for at lade AI skrive et personligt svar baseret på kundens forespørgsel — eller skriv dit eget."
                className="min-h-[220px] resize-y text-sm"
              />
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={sendDraftAsEmail} className="gap-1.5" disabled={!qr?.customer_email}>
                <Send className="h-4 w-4" /> Send som mail
              </Button>
              <Button variant="outline" onClick={copyDraft} disabled={!draft} className="gap-1.5">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Kopieret" : "Kopier"}
              </Button>
              <Button variant="ghost" onClick={saveDraft} disabled={saving} className="gap-1.5">
                <Save className="h-4 w-4" /> Gem udkast
              </Button>
            </div>
          </TabsContent>

          {/* Note tab */}
          <TabsContent value="note" className="space-y-3">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Privat note — kun synlig for jer. F.eks. aftaler, opkald-resultat eller særlige ønsker."
              className="min-h-[180px] resize-y text-sm"
            />
            <Button onClick={saveNote} disabled={saving} className="gap-1.5">
              <Save className="h-4 w-4" /> Gem note
            </Button>
          </TabsContent>

          {/* Follow up tab */}
          <TabsContent value="followup" className="space-y-4">
            <FollowUpEditor
              value={followUp}
              onChange={setFollowUp}
              onSave={saveFollowUp}
              saving={saving}
              currentSavedIso={lead.follow_up_at}
            />
          </TabsContent>
        </Tabs>

        {/* Status actions */}
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {lead.status !== "won" && (
            <Button size="sm" variant="outline" onClick={() => updateStatus("won")} className="gap-1.5">
              <Trophy className="h-4 w-4" /> Marker som vundet
            </Button>
          )}
          {lead.status !== "declined" && (
            <Button size="sm" variant="ghost" onClick={() => updateStatus("declined")} className="gap-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
              <XCircle className="h-4 w-4" /> Afvis lead
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
