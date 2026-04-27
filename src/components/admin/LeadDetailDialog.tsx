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
import {
  Sparkles, Mail, Phone, MapPin, Brain, Loader2, Send, RefreshCw, Save,
  StickyNote, Bell, Trophy, XCircle, Clock, Copy, Check,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { da } from "date-fns/locale";

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

  if (!lead) return null;
  const qr = lead.quote_request;

  const generateDraft = async (silent = false) => {
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
    if (open && lead && !lead.ai_draft && !generating && qr?.description) {
      generateDraft(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id]);

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
            <Badge variant="outline" className="gap-1 rounded-md">
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
          {lead.reason && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-accent/20 bg-accent/5 p-2.5 text-xs">
              <Brain className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              <p className="text-foreground/80"><span className="font-medium text-foreground">AI-match:</span> {lead.reason}</p>
            </div>
          )}
        </div>

        <Tabs defaultValue="reply" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="reply" className="gap-1.5"><Brain className="h-3.5 w-3.5" /> AI-svar</TabsTrigger>
            <TabsTrigger value="note" className="gap-1.5"><StickyNote className="h-3.5 w-3.5" /> Note</TabsTrigger>
            <TabsTrigger value="followup" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Opfølg</TabsTrigger>
          </TabsList>

          {/* AI reply tab */}
          <TabsContent value="reply" className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="h-9 w-[220px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => generateDraft(false)} disabled={generating} className="gap-1.5">
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {draft ? "Generer på ny" : "Generer udkast"}
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

            {generating && !draft && (
              <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                AI skriver et personligt udkast baseret på forespørgslen…
              </div>
            )}

            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Klik 'Generer udkast' for at lade AI skrive et personligt svar baseret på kundens forespørgsel — eller skriv dit eget."
              className="min-h-[220px] resize-y text-sm"
            />

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
          <TabsContent value="followup" className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sæt en påmindelse om at følge op på dette lead. I ser det øverst på leads-siden, når tiden er inde.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="datetime-local"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                className="h-10 w-[240px]"
              />
              <Button onClick={saveFollowUp} disabled={saving} className="gap-1.5">
                <Bell className="h-4 w-4" /> Gem påmindelse
              </Button>
              {followUp && (
                <Button variant="ghost" onClick={() => { setFollowUp(""); }} className="gap-1.5 text-muted-foreground">
                  <XCircle className="h-4 w-4" /> Ryd
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { label: "Om 1 time", h: 1 },
                { label: "Om 4 timer", h: 4 },
                { label: "I morgen kl. 9", custom: true },
                { label: "Om 3 dage", h: 24 * 3 },
                { label: "Om en uge", h: 24 * 7 },
              ].map((p) => (
                <Button
                  key={p.label}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => {
                    const d = new Date();
                    if (p.custom) {
                      d.setDate(d.getDate() + 1);
                      d.setHours(9, 0, 0, 0);
                    } else {
                      d.setHours(d.getHours() + (p.h as number));
                    }
                    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    setFollowUp(local);
                  }}
                >
                  <Clock className="mr-1 h-3 w-3" /> {p.label}
                </Button>
              ))}
            </div>
            {lead.follow_up_at && (
              <p className="text-xs text-muted-foreground">
                Aktuel påmindelse: {new Date(lead.follow_up_at).toLocaleString("da-DK")}
              </p>
            )}
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
            <Button size="sm" variant="ghost" onClick={() => updateStatus("declined")} className="gap-1.5 text-muted-foreground hover:text-destructive">
              <XCircle className="h-4 w-4" /> Afvis lead
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
