import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Mail, MessageSquare, Clock, Sparkles, Eye, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  businessId: string;
  upcomingHoursBefore: number;
  onUpcomingHoursChange: (hrs: number) => void;
  smsEnabled: boolean;
  onSmsEnabledChange: (v: boolean) => void;
}

type EventKey = "service_upcoming" | "service_completed";

const EVENTS: {
  key: EventKey;
  label: string;
  shortLabel: string;
  help: string;
  icon: string;
  defaults: { subject: string; body: string };
}[] = [
  {
    key: "service_upcoming",
    label: "Påmindelse før besøg",
    shortLabel: "Vi kommer snart",
    help: "Sendes automatisk et stykke tid før I kommer ud til kunden.",
    icon: "🔔",
    defaults: {
      subject: "Vi kommer og udfører {{service_name}}",
      body: "Hej {{customer_name}},\n\nVi kommer forbi {{planned_arrival}} og udfører {{service_name}}.\n\nVi glæder os til at se dig.\n\nVenlig hilsen,\n{{business_name}}",
    },
  },
  {
    key: "service_completed",
    label: "Kvittering efter besøg",
    shortLabel: "Vi er færdige",
    help: "Sendes automatisk når medarbejderen markerer opgaven som udført.",
    icon: "✅",
    defaults: {
      subject: "Vi har udført {{service_name}}",
      body: "Hej {{customer_name}},\n\nVi har i dag været forbi og udført {{service_name}}.\nDu modtager snarest faktura via vores regnskabssystem.\n\nTak fordi du valgte os.\n\nVenlig hilsen,\n{{business_name}}",
    },
  },
];

const SMS_DEFAULTS: Record<EventKey, string> = {
  service_upcoming: "Hej {{customer_name}}, vi kommer {{planned_arrival}} og udfører {{service_name}}. Mvh {{business_name}}",
  service_completed: "Hej {{customer_name}}, vi har udført {{service_name}} i dag. Faktura sendes snarest. Mvh {{business_name}}",
};

const PLACEHOLDERS: { key: string; label: string; example: string }[] = [
  { key: "customer_name", label: "Kundens navn", example: "Mette" },
  { key: "business_name", label: "Jeres firmanavn", example: "Rengøring København" },
  { key: "business_phone", label: "Jeres telefon", example: "+45 12 34 56 78" },
  { key: "service_name", label: "Service", example: "Rengøring" },
  { key: "planned_arrival", label: "Tidspunkt", example: "i morgen kl. 10:00" },
];

const EXAMPLE_VARS: Record<string, string> = Object.fromEntries(PLACEHOLDERS.map((p) => [p.key, p.example]));

function renderPreview(tpl: string): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => EXAMPLE_VARS[k] ?? `{{${k}}}`);
}

// Email preview matching supabase/functions/_shared/transactional-email-templates/_styles.ts
function EmailPreview({ subject, body }: { subject: string; body: string }) {
  const renderedSubject = renderPreview(subject);
  const renderedBody = renderPreview(body);
  const lines = renderedBody.split(/\n+/).filter((l) => l.trim().length > 0);
  return (
    <div className="rounded-lg border border-border bg-[#fafafa] p-4 overflow-hidden">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Eye className="h-3.5 w-3.5" />
        <span>Sådan ser e-mailen ud hos kunden</span>
      </div>
      <div
        className="mx-auto bg-white rounded-md shadow-sm overflow-hidden border border-border/50"
        style={{ maxWidth: 480, fontFamily: 'Inter, -apple-system, sans-serif' }}
      >
        {/* fake email header */}
        <div className="px-5 pt-4 pb-3 border-b border-[#ececec]">
          <div className="text-[11px] uppercase tracking-wide text-[#737373] font-medium">Emne</div>
          <div className="text-[14px] text-[#212121] font-medium mt-0.5 line-clamp-2">{renderedSubject || "(intet emne)"}</div>
        </div>
        {/* body */}
        <div className="px-5 py-5">
          <div className="pb-4 border-b border-[#ececec] mb-5">
            <div className="text-[10px] font-semibold tracking-wider text-[#212121]">SERVICEYDERE</div>
          </div>
          <h1 className="text-[22px] font-semibold text-[#212121] leading-tight mb-3" style={{ letterSpacing: '-0.015em' }}>
            {renderedSubject}
          </h1>
          {lines.map((l, i) => (
            <p key={i} className="text-[14px] text-[#525252] leading-[1.65] mb-3 whitespace-pre-wrap">{l}</p>
          ))}
          <div className="border-t border-[#ececec] mt-7 pt-4">
            <p className="text-[11px] text-[#a3a3a3]">Sendt af {EXAMPLE_VARS.business_name} via Serviceydere.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// SMS preview as iMessage-style chat bubble
function SmsPreview({ body, businessName, businessPhone }: { body: string; businessName: string; businessPhone: string }) {
  const rendered = renderPreview(body);
  const footer = `\n\nDenne SMS kan ikke besvares. Kontakt ${businessName} på ${businessPhone}.`;
  const full = rendered + footer;
  const charCount = full.length;
  const smsCount = Math.max(1, Math.ceil(charCount / 160));
  return (
    <div className="rounded-lg border border-border bg-[#fafafa] p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Eye className="h-3.5 w-3.5" />
        <span>Sådan ser SMS'en ud på kundens telefon</span>
      </div>
      <div
        className="mx-auto bg-white rounded-2xl border border-border/50 overflow-hidden"
        style={{ maxWidth: 320 }}
      >
        {/* phone status bar */}
        <div className="bg-[#f5f5f7] px-4 py-2.5 border-b border-border/50 text-center">
          <div className="text-[11px] font-semibold text-[#212121]">Serviceyder</div>
          <div className="text-[10px] text-[#737373]">Tekstbesked · nu</div>
        </div>
        <div className="p-3 bg-white min-h-[140px]">
          <div className="bg-[#e5e5ea] text-[#212121] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-[13px] leading-[1.45] whitespace-pre-wrap max-w-[85%]">
            {full}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-3 px-1">
        <span>{charCount} tegn</span>
        <span>{smsCount} SMS{smsCount > 1 ? "'er" : ""} (1 SMS = 160 tegn)</span>
      </div>
    </div>
  );
}

function PlaceholderChips({ onInsert }: { onInsert: (token: string) => void }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap gap-1.5">
        {PLACEHOLDERS.map((p) => (
          <Tooltip key={p.key}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onInsert(`{{${p.key}}}`)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Sparkles className="h-3 w-3 text-accent" />
                {p.label}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Indsætter fx: <span className="font-medium">{p.example}</span></p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

export function CustomerNotificationsSettings({
  businessId, upcomingHoursBefore, onUpcomingHoursChange,
  smsEnabled, onSmsEnabledChange,
}: Props) {
  const qc = useQueryClient();
  const { data: rows, isLoading } = useQuery({
    queryKey: ["customer-notif-templates", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_notification_templates")
        .select("*")
        .eq("business_id", businessId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: businessInfo } = useQuery({
    queryKey: ["biz-name-phone", businessId],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("name, phone").eq("id", businessId).maybeSingle();
      return data ?? { name: "", phone: "" };
    },
  });

  const [drafts, setDrafts] = useState<Record<EventKey, { subject: string; body: string; enabled: boolean }>>(() => {
    const obj = {} as any;
    EVENTS.forEach((e) => { obj[e.key] = { subject: e.defaults.subject, body: e.defaults.body, enabled: true }; });
    return obj;
  });
  const [smsDrafts, setSmsDrafts] = useState<Record<EventKey, { body: string; enabled: boolean }>>(() => {
    const obj = {} as any;
    EVENTS.forEach((e) => { obj[e.key] = { body: SMS_DEFAULTS[e.key], enabled: true }; });
    return obj;
  });
  const [activeEvent, setActiveEvent] = useState<EventKey>("service_upcoming");
  const [channelTab, setChannelTab] = useState<"email" | "sms">("email");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!rows) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const e of EVENTS) {
        const existing = rows.find((r: any) => r.event_type === e.key && (r.channel ?? "email") === "email");
        if (existing) next[e.key] = { subject: existing.subject, body: existing.body, enabled: existing.enabled };
      }
      return next;
    });
    setSmsDrafts((prev) => {
      const next = { ...prev };
      for (const e of EVENTS) {
        const existing = rows.find((r: any) => r.event_type === e.key && r.channel === "sms");
        if (existing) next[e.key] = { body: existing.body, enabled: existing.enabled };
      }
      return next;
    });
  }, [rows]);

  const save = async (key: EventKey) => {
    setSaving(`email-${key}`);
    const d = drafts[key];
    const { error } = await supabase
      .from("customer_notification_templates")
      .upsert({
        business_id: businessId, event_type: key, channel: "email",
        subject: d.subject, body: d.body, enabled: d.enabled,
      }, { onConflict: "business_id,event_type,channel" });
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success("E-mail-skabelon gemt");
    qc.invalidateQueries({ queryKey: ["customer-notif-templates", businessId] });
  };

  const saveSms = async (key: EventKey) => {
    setSaving(`sms-${key}`);
    const d = smsDrafts[key];
    const { error } = await supabase
      .from("customer_notification_templates")
      .upsert({
        business_id: businessId, event_type: key, channel: "sms",
        subject: null, body: d.body, enabled: d.enabled,
      }, { onConflict: "business_id,event_type,channel" });
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success("SMS-skabelon gemt");
    qc.invalidateQueries({ queryKey: ["customer-notif-templates", businessId] });
  };

  const insertPlaceholderEmailBody = (token: string) =>
    setDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], body: p[activeEvent].body + " " + token } }));
  const insertPlaceholderEmailSubject = (token: string) =>
    setDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], subject: p[activeEvent].subject + " " + token } }));
  const insertPlaceholderSms = (token: string) =>
    setSmsDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], body: p[activeEvent].body + " " + token } }));

  if (isLoading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const event = EVENTS.find((e) => e.key === activeEvent)!;
  const exampleBizName = businessInfo?.name?.trim() || EXAMPLE_VARS.business_name;
  const exampleBizPhone = businessInfo?.phone?.trim() || EXAMPLE_VARS.business_phone;

  return (
    <div className="space-y-5">
      {/* Step 1 — timing card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-sm font-semibold">1</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold">Hvornår skal kunden have en påmindelse?</Label>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Vælg hvor mange timer før I kommer ud til kunden, at påmindelsen skal sendes.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Input
                type="number" min={1} max={168} className="w-24"
                value={upcomingHoursBefore}
                onChange={(e) => onUpcomingHoursChange(Math.max(1, Math.min(168, Number(e.target.value) || 24)))}
              />
              <span className="text-sm text-muted-foreground">timer før besøget</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2 — SMS toggle card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-sm font-semibold">2</div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-semibold">Send også SMS til kunderne</Label>
                </div>
                <p className="mt-1 text-xs text-muted-foreground max-w-prose">
                  Med SMS får kunden også en besked på telefonen. Afsenderen står som <span className="font-medium text-foreground">"Serviceyder"</span>,
                  og vi tilføjer automatisk en linje med jeres firmanavn og telefonnummer, så kunden ved hvem de skal ringe til.
                </p>
              </div>
              <Switch checked={smsEnabled} onCheckedChange={onSmsEnabledChange} />
            </div>
          </div>
        </div>
      </div>

      {/* Step 3 — templates with live preview */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-start gap-3 p-5 pb-4 border-b border-border">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-sm font-semibold">3</div>
          <div>
            <Label className="text-sm font-semibold">Tilpas beskederne til kunderne</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Vælg en besked til venstre, ret teksten — og se med det samme hvordan kunden vil opleve den.
            </p>
          </div>
        </div>

        {/* Event picker */}
        <div className="px-5 pt-4 pb-2 flex flex-wrap gap-2">
          {EVENTS.map((e) => {
            const active = e.key === activeEvent;
            return (
              <button
                key={e.key}
                onClick={() => setActiveEvent(e.key)}
                className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors ${
                  active ? "bg-foreground text-background border-foreground" : "bg-background text-foreground border-border hover:bg-muted"
                }`}
              >
                <span>{e.icon}</span>
                <span>{e.label}</span>
              </button>
            );
          })}
        </div>
        <p className="px-5 pb-4 text-xs text-muted-foreground">{event.help}</p>

        {/* Channel tabs */}
        <div className="px-5 border-t border-border pt-4 flex gap-1 bg-muted/30">
          {(["email", "sms"] as const).map((c) => {
            const active = channelTab === c;
            const Icon = c === "email" ? Mail : MessageSquare;
            const enabledForChannel = c === "email" ? drafts[activeEvent].enabled : smsDrafts[activeEvent].enabled && smsEnabled;
            return (
              <button
                key={c}
                onClick={() => setChannelTab(c)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-md transition-colors ${
                  active ? "bg-card text-foreground border border-border border-b-card -mb-px" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {c === "email" ? "E-mail" : "SMS"}
                {enabledForChannel && <Check className="h-3 w-3 text-accent" />}
                {c === "sms" && !smsEnabled && <span className="text-[10px] text-muted-foreground">(slået fra)</span>}
              </button>
            );
          })}
        </div>

        {/* Editor + preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-5 bg-card">
          {channelTab === "email" ? (
            <>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Send denne e-mail</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Slå fra hvis I ikke vil sende e-mail for denne hændelse.</p>
                  </div>
                  <Switch
                    checked={drafts[activeEvent].enabled}
                    onCheckedChange={(v) => setDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], enabled: v } }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Emne (det kunden ser i sin indbakke)</Label>
                  <Input
                    value={drafts[activeEvent].subject}
                    onChange={(ev) => setDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], subject: ev.target.value } }))}
                  />
                  <PlaceholderChips onInsert={insertPlaceholderEmailSubject} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Selve beskeden</Label>
                  <Textarea
                    rows={9}
                    value={drafts[activeEvent].body}
                    onChange={(ev) => setDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], body: ev.target.value } }))}
                  />
                  <PlaceholderChips onInsert={insertPlaceholderEmailBody} />
                  <p className="text-[11px] text-muted-foreground">💡 Tip: Klik på en boble for at indsætte personlige oplysninger som kundens navn eller tidspunktet.</p>
                </div>
                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={() => save(activeEvent)} disabled={saving === `email-${activeEvent}`}>
                    {saving === `email-${activeEvent}` ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                    Gem ændringer
                  </Button>
                </div>
              </div>
              <div>
                <EmailPreview subject={drafts[activeEvent].subject} body={drafts[activeEvent].body} />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Send denne SMS</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {smsEnabled ? "Slå fra hvis I ikke vil sende SMS for denne hændelse." : "Slå SMS til øverst for at aktivere."}
                    </p>
                  </div>
                  <Switch
                    checked={smsDrafts[activeEvent].enabled}
                    disabled={!smsEnabled}
                    onCheckedChange={(v) => setSmsDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], enabled: v } }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">SMS-tekst</Label>
                  <Textarea
                    rows={6}
                    value={smsDrafts[activeEvent].body}
                    disabled={!smsEnabled}
                    maxLength={459}
                    onChange={(ev) => setSmsDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], body: ev.target.value } }))}
                  />
                  <PlaceholderChips onInsert={insertPlaceholderSms} />
                  <p className="text-[11px] text-muted-foreground">
                    💡 Hold beskeden kort — under 160 tegn er 1 SMS. Vi tilføjer selv en kort linje i bunden med jeres firmanavn og telefon.
                  </p>
                </div>
                <div className="flex justify-end pt-2">
                  <Button size="sm" variant="outline" disabled={!smsEnabled || saving === `sms-${activeEvent}`} onClick={() => saveSms(activeEvent)}>
                    {saving === `sms-${activeEvent}` ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                    Gem ændringer
                  </Button>
                </div>
              </div>
              <div>
                <SmsPreview body={smsDrafts[activeEvent].body} businessName={exampleBizName} businessPhone={exampleBizPhone} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
