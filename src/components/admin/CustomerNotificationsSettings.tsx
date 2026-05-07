import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Mail, MessageSquare, Clock, Bell, CheckCircle2, RotateCcw, Phone, Plus, AlarmClock, CalendarDays } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  businessId: string;
  upcomingMinutesBefore: number;
  onUpcomingMinutesChange: (mins: number) => void;
  smsEnabled: boolean;
  onSmsEnabledChange: (v: boolean) => void;
}

type EventKey = "service_upcoming" | "service_completed";

const EVENTS: {
  key: EventKey;
  label: string;
  shortLabel: string;
  help: string;
  Icon: typeof Bell;
  defaults: { subject: string; body: string };
}[] = [
  {
    key: "service_upcoming",
    label: "Påmindelse inden besøg",
    shortLabel: "Sendes inden I kommer",
    help: "En venlig påmindelse til kunden om hvornår I kommer forbi. Sendes automatisk et stykke tid før det planlagte besøg.",
    Icon: Bell,
    defaults: {
      subject: "Vi kommer og udfører {{service}}",
      body: "Hej {{kundens_navn}},\n\nVi kommer forbi {{tidspunkt}} og udfører {{service}}.\n\nVi glæder os til at se dig.\n\nVenlig hilsen,\n{{firmanavn}}",
    },
  },
  {
    key: "service_completed",
    label: "Kvittering efter besøg",
    shortLabel: "Sendes når opgaven er færdig",
    help: "En kvittering til kunden når besøget er udført. Sendes automatisk så snart medarbejderen markerer opgaven som færdig.",
    Icon: CheckCircle2,
    defaults: {
      subject: "Vi har udført {{service}}",
      body: "Hej {{kundens_navn}},\n\nVi har i dag været forbi og udført {{service}}.\nDu modtager snarest faktura via vores regnskabssystem.\n\nTak fordi du valgte os.\n\nVenlig hilsen,\n{{firmanavn}}",
    },
  },
];

const SMS_DEFAULTS: Record<EventKey, string> = {
  service_upcoming: "Hej {{kundens_navn}}, vi kommer {{tidspunkt}} og udfører {{service}}. Mvh {{firmanavn}}",
  service_completed: "Hej {{kundens_navn}}, vi har udført {{service}} i dag. Faktura sendes snarest. Mvh {{firmanavn}}",
};

// Danske variabel-navne — vises i UI'et og virker også i skabeloner.
// Vi understøtter også de gamle engelske navne for bagudkompatibilitet.
const PLACEHOLDERS: { key: string; label: string; example: string }[] = [
  { key: "kundens_navn", label: "Kundens navn", example: "Mette Hansen" },
  { key: "firmanavn", label: "Jeres firmanavn", example: "Rengøring København" },
  { key: "telefon", label: "Jeres telefonnummer", example: "+45 12 34 56 78" },
  { key: "service", label: "Service", example: "ugentlig rengøring" },
  { key: "tidspunkt", label: "Tidspunkt", example: "torsdag d. 7. maj kl. 10:00" },
];

// Mapping: dansk eller gammelt engelsk navn → eksempel-værdi
const ALIASES: Record<string, string> = {
  kundens_navn: "kundens_navn", customer_name: "kundens_navn",
  firmanavn: "firmanavn", business_name: "firmanavn",
  telefon: "telefon", business_phone: "telefon",
  service: "service", service_name: "service",
  tidspunkt: "tidspunkt", planned_arrival: "tidspunkt",
};
const EXAMPLE_VARS: Record<string, string> = Object.fromEntries(PLACEHOLDERS.map((p) => [p.key, p.example]));

function renderPreview(tpl: string): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
    const canonical = ALIASES[k] ?? k;
    return EXAMPLE_VARS[canonical] ?? `{{${k}}}`;
  });
}

/* ─────────────────────── SCHEDULE HELPERS ─────────────────────── */
// Påmindelser sendes på et bestemt klokkeslæt N dage før selve aftalen.
// Beregnes ud fra den planlagte ankomst-dato på rutekalenderen.

type ScheduleDays = 0 | 1 | 2 | 7;
const DAY_OPTIONS: { value: ScheduleDays; label: string; short: string }[] = [
  { value: 0, label: "Samme dag",     short: "i dag" },
  { value: 1, label: "Dagen før",     short: "1 dag før" },
  { value: 2, label: "2 dage før",    short: "2 dage før" },
  { value: 7, label: "1 uge før",     short: "1 uge før" },
];
const DEFAULT_SCHEDULE: { days: ScheduleDays; time: string } = { days: 1, time: "09:00" };
const TIME_PRESETS = ["08:00", "09:00", "12:00", "16:00", "18:00"];

const formatSchedule = (days: ScheduleDays, time: string): string => {
  const d = DAY_OPTIONS.find((o) => o.value === days)?.label ?? `${days} dage før`;
  return `${d} kl. ${time}`;
};

// Kompatibilitet: hvis en gammel række kun har lead_time_minutes (gammelt
// design), så approximér til { days, time } så brugeren får et rimeligt
// udgangspunkt at justere fra.
const minutesToSchedule = (mins: number | null | undefined): { days: ScheduleDays; time: string } => {
  if (mins == null) return { ...DEFAULT_SCHEDULE };
  if (mins >= 7 * 24 * 60) return { days: 7, time: "09:00" };
  if (mins >= 2 * 24 * 60) return { days: 2, time: "09:00" };
  if (mins >= 24 * 60)     return { days: 1, time: "09:00" };
  return { days: 0, time: "08:00" };
};

function SchedulePicker({
  days, time, onChange, label, channel,
}: {
  days: ScheduleDays; time: string;
  onChange: (next: { days: ScheduleDays; time: string }) => void;
  label: string; channel: "email" | "sms";
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[12px] font-semibold text-foreground">{label}</p>
        </div>
        <span className="rounded-md bg-background px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
          {channel === "email" ? "E-mail" : "SMS"}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Sendes <span className="font-medium text-foreground">{formatSchedule(days, time)}</span> ud fra aftalens dato på rutekalenderen.
      </p>

      <div className="mt-2.5">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Hvornår</p>
        <div className="flex flex-wrap gap-1.5">
          {DAY_OPTIONS.map((o) => {
            const active = days === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange({ days: o.value, time })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground hover:border-foreground/50",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Klokkeslæt</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {TIME_PRESETS.map((t) => {
            const active = time === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onChange({ days, time: t })}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors tabular-nums",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground hover:border-foreground/50",
                )}
              >
                kl. {t}
              </button>
            );
          })}
          <Input
            type="time"
            value={time}
            onChange={(e) => onChange({ days, time: e.target.value || "09:00" })}
            className="h-8 w-[110px] tabular-nums"
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── PREVIEWS ─────────────────────── */

function EmailPreview({ subject, body, businessName }: { subject: string; body: string; businessName: string }) {
  const rSubject = renderPreview(subject);
  const rBody = renderPreview(body);
  const lines = rBody.split(/\n+/).filter((l) => l.trim().length > 0);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[#f4f4f5]">
      {/* Mac-style window chrome */}
      <div className="flex items-center gap-1.5 border-b border-border/60 bg-[#ececee] px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-[11px] font-medium text-[#737373]">Indbakke · Mail</span>
      </div>
      <div className="px-4 py-4">
        <div
          className="mx-auto overflow-hidden rounded-lg border border-border/60 bg-white shadow-sm"
          style={{ maxWidth: 460, fontFamily: 'Inter, -apple-system, sans-serif' }}
        >
          {/* From / subject header */}
          <div className="border-b border-[#ececec] px-5 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#212121] text-[10px] font-semibold text-white">
                {(businessName || "S").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[12px] font-medium text-[#212121]">{businessName || "Serviceydere"}</div>
                <div className="truncate text-[10px] text-[#737373]">via Serviceydere · til kunden</div>
              </div>
            </div>
            <div className="mt-2.5 text-[13px] font-semibold text-[#212121] line-clamp-2">{rSubject || "(intet emne)"}</div>
          </div>
          {/* Body */}
          <div className="px-5 py-5">
            <div className="mb-4 pb-3">
              <div className="text-[10px] font-bold tracking-[0.18em] text-[#212121]">SERVICEYDERE</div>
            </div>
            <h1 className="mb-3 text-[20px] font-semibold leading-tight text-[#212121]" style={{ letterSpacing: '-0.015em' }}>
              {rSubject}
            </h1>
            {lines.map((l, i) => (
              <p key={i} className="mb-3 whitespace-pre-wrap text-[13.5px] leading-[1.65] text-[#525252]">{l}</p>
            ))}
            <div className="mt-6 border-t border-[#ececec] pt-3">
              <p className="text-[10.5px] text-[#a3a3a3]">Sendt af {businessName || "din virksomhed"} via Serviceydere.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SmsPreview({ body, businessName, businessPhone }: { body: string; businessName: string; businessPhone: string }) {
  const rendered = renderPreview(body);
  const footer = `\n\nDenne SMS kan ikke besvares. Kontakt ${businessName || "virksomheden"} på ${businessPhone || "+45 12 34 56 78"}.`;
  const full = rendered + footer;
  const charCount = full.length;
  const smsCount = Math.max(1, Math.ceil(charCount / 160));
  // Forenklet SMS-preview: en lille kortlignende ramme med afsender-header
  // og en grå besked-boble. Skalerer pænt på mobil/tablet (ingen fast bredde,
  // ingen tung iOS-chrome som dynamic island, status-bar eller home indicator).
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
      <div
        className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
      >
        {/* Afsender-header */}
        <div className="flex items-center gap-2.5 border-b border-[#e5e5ea] bg-[#f6f6f6] px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1c1c1e] text-[11px] font-semibold text-white">
            {(businessName || "S").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-[#1c1c1e]">{businessName || "Din virksomhed"}</p>
            <p className="text-[10.5px] text-[#8e8e93]">SMS · i dag 9.41</p>
          </div>
        </div>

        {/* Besked */}
        <div className="bg-white px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex max-w-[90%]">
            <div className="whitespace-pre-wrap break-words rounded-[18px] bg-[#e9e9eb] px-3 py-2 text-[13px] leading-[1.4] text-black">
              {full}
            </div>
          </div>
        </div>
      </div>

      {/* Stats nedenunder */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span><span className="font-semibold text-foreground">{charCount}</span> tegn</span>
        <span><span className="font-semibold text-foreground">{smsCount}</span> SMS{smsCount > 1 ? "'er" : ""} <span className="opacity-70">(160/SMS)</span></span>
      </div>
    </div>
  );
}

/* ─────────────────────── PLACEHOLDER PICKER ─────────────────────── */

function PlaceholderRow({ onInsert, compact = false }: { onInsert: (token: string) => void; compact?: boolean }) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-wrap items-center gap-1.5">
        {!compact && <span className="mr-1 text-[11px] font-medium text-muted-foreground">Indsæt:</span>}
        {PLACEHOLDERS.map((p) => (
          <Tooltip key={p.key}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onInsert(`{{${p.key}}}`)}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-foreground hover:bg-muted"
              >
                <Plus className="h-3 w-3 text-muted-foreground" />
                {p.label}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px]">
              <p className="text-xs">Erstattes automatisk med kundens rigtige info.</p>
              <p className="mt-1 text-xs"><span className="text-muted-foreground">Eksempel:</span> <span className="font-medium">{p.example}</span></p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

/* ─────────────────────── HOOKS ─────────────────────── */

function useInsertAtCursor<T extends HTMLInputElement | HTMLTextAreaElement>(
  value: string,
  setValue: (s: string) => void,
) {
  const ref = useRef<T | null>(null);
  const insert = (token: string) => {
    const el = ref.current;
    if (!el) {
      setValue(value + " " + token);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };
  return { ref, insert };
}

/* ─────────────────────── MAIN ─────────────────────── */

export function CustomerNotificationsSettings({
  businessId, upcomingMinutesBefore, onUpcomingMinutesChange,
  smsEnabled, onSmsEnabledChange,
}: Props) {
  const qc = useQueryClient();
  const { data: rows, isLoading } = useQuery({
    queryKey: ["customer-notif-templates", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_notification_templates").select("*").eq("business_id", businessId);
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

  type EmailDraft = { subject: string; body: string; enabled: boolean; days: ScheduleDays; time: string };
  type SmsDraft   = { body: string; enabled: boolean; days: ScheduleDays; time: string };
  const [drafts, setDrafts] = useState<Record<EventKey, EmailDraft>>(() => {
    const o = {} as any;
    EVENTS.forEach((e) => { o[e.key] = { subject: e.defaults.subject, body: e.defaults.body, enabled: true, ...DEFAULT_SCHEDULE }; });
    return o;
  });
  const [smsDrafts, setSmsDrafts] = useState<Record<EventKey, SmsDraft>>(() => {
    const o = {} as any;
    EVENTS.forEach((e) => { o[e.key] = { body: SMS_DEFAULTS[e.key], enabled: true, ...DEFAULT_SCHEDULE }; });
    return o;
  });
  const [savedSnapshot, setSavedSnapshot] = useState<{ email: typeof drafts; sms: typeof smsDrafts } | null>(null);

  const [activeEvent, setActiveEvent] = useState<EventKey>("service_upcoming");
  const [channelTab, setChannelTab] = useState<"email" | "sms">("email");
  // Auto-save state — vi gemmer i baggrunden uden knapper.

  useEffect(() => {
    if (!rows) return;
    const nextEmail = { ...drafts };
    const nextSms = { ...smsDrafts };
    for (const e of EVENTS) {
      const eRow = rows.find((r: any) => r.event_type === e.key && (r.channel ?? "email") === "email");
      if (eRow) {
        const fallback = minutesToSchedule(eRow.lead_time_minutes);
        nextEmail[e.key] = {
          subject: eRow.subject, body: eRow.body, enabled: eRow.enabled,
          days: (eRow.days_before ?? fallback.days) as ScheduleDays,
          time: (eRow.send_at_time ? String(eRow.send_at_time).slice(0, 5) : fallback.time),
        };
      }
      const sRow = rows.find((r: any) => r.event_type === e.key && r.channel === "sms");
      if (sRow) {
        const fallback = minutesToSchedule(sRow.lead_time_minutes);
        nextSms[e.key] = {
          body: sRow.body, enabled: sRow.enabled,
          days: (sRow.days_before ?? fallback.days) as ScheduleDays,
          time: (sRow.send_at_time ? String(sRow.send_at_time).slice(0, 5) : fallback.time),
        };
      }
    }
    setDrafts(nextEmail);
    setSmsDrafts(nextSms);
    setSavedSnapshot({ email: nextEmail, sms: nextSms });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const isEmailDirty = (k: EventKey) => {
    const a = drafts[k]; const b = savedSnapshot?.email[k];
    if (!b) return true;
    return a.subject !== b.subject || a.body !== b.body || a.enabled !== b.enabled || a.days !== b.days || a.time !== b.time;
  };
  const isSmsDirty = (k: EventKey) => {
    const a = smsDrafts[k]; const b = savedSnapshot?.sms[k];
    if (!b) return true;
    return a.body !== b.body || a.enabled !== b.enabled || a.days !== b.days || a.time !== b.time;
  };

  const saveEmailNow = async (key: EventKey, d: EmailDraft) => {
    const leadMinutes = key === "service_upcoming" ? (d.days * 24 * 60) : null;
    const { error } = await supabase
      .from("customer_notification_templates")
      .upsert({ business_id: businessId, event_type: key, channel: "email",
        subject: d.subject, body: d.body, enabled: d.enabled,
        lead_time_minutes: leadMinutes,
        days_before: key === "service_upcoming" ? d.days : null,
        send_at_time: key === "service_upcoming" ? d.time : null,
      } as any, { onConflict: "business_id,event_type,channel" });
    if (error) { toast.error(error.message); return; }
    setSavedSnapshot((s) => ({ email: { ...(s?.email ?? drafts), [key]: d }, sms: s?.sms ?? smsDrafts }));
  };

  const saveSmsNow = async (key: EventKey, d: SmsDraft) => {
    const leadMinutes = key === "service_upcoming" ? (d.days * 24 * 60) : null;
    const { error } = await supabase
      .from("customer_notification_templates")
      .upsert({ business_id: businessId, event_type: key, channel: "sms",
        subject: null, body: d.body, enabled: d.enabled,
        lead_time_minutes: leadMinutes,
        days_before: key === "service_upcoming" ? d.days : null,
        send_at_time: key === "service_upcoming" ? d.time : null,
      } as any, { onConflict: "business_id,event_type,channel" });
    if (error) { toast.error(error.message); return; }
    setSavedSnapshot((s) => ({ email: s?.email ?? drafts, sms: { ...(s?.sms ?? smsDrafts), [key]: d } }));
  };

  const resetEmail = (key: EventKey) => {
    const ev = EVENTS.find((e) => e.key === key)!;
    setDrafts((p) => ({ ...p, [key]: { ...p[key], subject: ev.defaults.subject, body: ev.defaults.body } }));
  };
  const resetSms = (key: EventKey) => {
    setSmsDrafts((p) => ({ ...p, [key]: { ...p[key], body: SMS_DEFAULTS[key] } }));
  };

  // Cursor-aware inserts for active editor
  const subjectCursor = useInsertAtCursor<HTMLInputElement>(
    drafts[activeEvent].subject,
    (s) => setDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], subject: s } })),
  );
  const bodyCursor = useInsertAtCursor<HTMLTextAreaElement>(
    drafts[activeEvent].body,
    (s) => setDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], body: s } })),
  );
  const smsCursor = useInsertAtCursor<HTMLTextAreaElement>(
    smsDrafts[activeEvent].body,
    (s) => setSmsDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], body: s } })),
  );

  const event = EVENTS.find((e) => e.key === activeEvent)!;
  const exampleBizName = businessInfo?.name?.trim() || EXAMPLE_VARS.firmanavn;
  const exampleBizPhone = businessInfo?.phone?.trim() || EXAMPLE_VARS.telefon;
  const emailDirty = isEmailDirty(activeEvent);
  const smsDirty = isSmsDirty(activeEvent);
  // (status vises inline pr. kanal længere nede)

  // Auto-gem (debounced) når brugeren ændrer noget. Vi kører pr. event/kanal
  // hver gang den specifikke draft adskiller sig fra det gemte snapshot,
  // så hver besked gemmer uafhængigt og ingen "Gem"-knap er nødvendig.
  useEffect(() => {
    if (!savedSnapshot) return;
    const t = setTimeout(() => {
      EVENTS.forEach((e) => {
        if (isEmailDirty(e.key)) saveEmailNow(e.key, drafts[e.key]);
        if (isSmsDirty(e.key))   saveSmsNow(e.key, smsDrafts[e.key]);
      });
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts, smsDrafts, savedSnapshot]);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* ───── Globale indstillinger ───── */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Hvordan-virker-det info-card — erstatter den gamle "Standardtid før besøget"-knapsalat,
            fordi tidspunktet nu sættes pr. besked længere nede (klokkeslæt + dage før). */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5">
              <CalendarDays className="h-4 w-4 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Sådan beregnes afsendelsestidspunktet</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                For hver påmindelse vælger I et <span className="font-medium text-foreground">klokkeslæt</span> og hvor mange <span className="font-medium text-foreground">dage før</span> aftalen
                den skal sendes (samme dag, dagen før, 2 dage før eller 1 uge før).
              </p>
              <p className="mt-2 text-[12px] text-muted-foreground">
                Vi finder selv aftalens dato på rutekalenderen og sender beskeden på det rigtige tidspunkt — ingen manuel timing nødvendig.
              </p>
              <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Eksempel:</span> Aftale tirsdag d. 14. → "Dagen før kl. 16:00" sender mandag d. 13. kl. 16:00.
              </div>
            </div>
          </div>
        </div>

        {/* SMS toggle */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30">
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            smsEnabled ? "bg-accent/15" : "bg-foreground/5",
          )}>
            <MessageSquare className={cn("h-4 w-4", smsEnabled ? "text-accent" : "text-foreground")} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Send også som SMS til kundens telefon</p>
              <Switch checked={smsEnabled} onCheckedChange={onSmsEnabledChange} />
            </div>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Når slået til, sender vi en kort SMS samtidig med e-mailen. Kunden ser <span className="font-medium text-foreground">Serviceydere</span> som afsender.
            </p>
          </div>
        </label>
      </div>

      {/* ───── Two column: list + editor ───── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        {/* Left list */}
        <nav className="space-y-2">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Beskeder til kunder</p>
          {EVENTS.map((e) => {
            const active = e.key === activeEvent;
            const eOn = drafts[e.key].enabled;
            const sOn = smsDrafts[e.key].enabled && smsEnabled;
            const Icon = e.Icon;
            return (
              <button
                key={e.key}
                onClick={() => setActiveEvent(e.key)}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all",
                  active ? "border-foreground bg-foreground/[0.03] shadow-sm" : "border-border bg-card hover:border-foreground/30",
                )}
              >
                <div className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  active ? "bg-foreground text-background" : "bg-muted text-foreground",
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{e.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{e.shortLabel}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                      eOn ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground",
                    )}>
                      <Mail className="h-2.5 w-2.5" /> E-mail {eOn ? "til" : "fra"}
                    </span>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                      sOn ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground",
                    )}>
                      <MessageSquare className="h-2.5 w-2.5" /> SMS {sOn ? "til" : "fra"}
                    </span>
                    {e.key === "service_upcoming" && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground" title="Hvornår beskederne sendes før besøget">
                        <AlarmClock className="h-2.5 w-2.5" />
                        {formatSchedule(drafts[e.key].days, drafts[e.key].time)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Help */}
          <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-3">
            <p className="text-[11px] font-semibold text-foreground">💡 Sådan virker det</p>
            <p className="mt-1 text-[11px] leading-[1.55] text-muted-foreground">
              Når en aftale planlægges eller markeres som færdig, sender vi automatisk de beskeder I har slået til.
              Tekst i klammer som <code className="rounded bg-background px-1 text-[10px]">{`{{kundens navn}}`}</code> bliver erstattet med rigtige oplysninger.
            </p>
          </div>
        </nav>

        {/* Right editor */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {/* Header — ren titel + beskrivelse. Kanal-toggles findes på hver fane
              for at undgå at samme knap forsøger at styre to ting på én gang. */}
          <div className="flex items-start gap-3 border-b border-border bg-muted/40 px-5 py-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-foreground">
              <event.Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{event.label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{event.help}</p>
            </div>
          </div>

          {/* Channel tabs */}
          <div className="flex border-b border-border bg-card px-3">
            {(["email", "sms"] as const).map((c) => {
              const active = channelTab === c;
              const Icon = c === "email" ? Mail : MessageSquare;
              const enabled = c === "email" ? drafts[activeEvent].enabled : smsDrafts[activeEvent].enabled && smsEnabled;
              const dirty = c === "email" ? emailDirty : smsDirty;
              return (
                <button
                  key={c}
                  onClick={() => setChannelTab(c)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {c === "email" ? "E-mail" : "SMS"}
                  <span className={cn(
                    "ml-1 inline-flex h-5 items-center rounded-full px-1.5 text-[10px] font-medium",
                    enabled ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground",
                  )}>
                    {enabled ? "Til" : "Fra"}
                  </span>
                  {dirty && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" title="Ikke gemt" />}
                  {active && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-foreground" />}
                </button>
              );
            })}
          </div>

          {/* Content */}
          {channelTab === "email" ? (
            <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
              {/* Editor */}
              <div className="space-y-4 p-5">
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Send denne e-mail til kunden</p>
                    <p className="text-[11px] text-muted-foreground">Slå fra hvis I ikke vil sende e-mail for denne hændelse.</p>
                  </div>
                  <Switch
                    checked={drafts[activeEvent].enabled}
                    onCheckedChange={(v) => setDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], enabled: v } }))}
                  />
                </label>

                {activeEvent === "service_upcoming" && (
                  <SchedulePicker
                    label="Hvornår skal e-mailen sendes?"
                    channel="email"
                    days={drafts[activeEvent].days}
                    time={drafts[activeEvent].time}
                    onChange={(s) => setDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], days: s.days, time: s.time } }))}
                  />
                )}

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Emnelinje</Label>
                  <Input
                    ref={subjectCursor.ref}
                    value={drafts[activeEvent].subject}
                    onChange={(ev) => setDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], subject: ev.target.value } }))}
                    placeholder="Det første kunden ser i indbakken"
                  />
                  <PlaceholderRow onInsert={subjectCursor.insert} compact />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Selve beskeden</Label>
                  <Textarea
                    ref={bodyCursor.ref}
                    rows={10}
                    value={drafts[activeEvent].body}
                    onChange={(ev) => setDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], body: ev.target.value } }))}
                  />
                  <PlaceholderRow onInsert={bodyCursor.insert} />
                  <p className="text-[11px] text-muted-foreground">
                    💡 Klik en knap for at indsætte personlige oplysninger. De erstattes automatisk med kundens rigtige info.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resetEmail(activeEvent)}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Nulstil tekst
                  </Button>
                  <span className="inline-flex items-center gap-1.5">
                    {emailDirty ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /> Gemmer…</>
                    ) : (
                      <><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Gemmes automatisk</>
                    )}
                  </span>
                </div>
              </div>

              {/* Preview */}
              <div className="border-t border-border bg-muted/20 p-5 lg:border-l lg:border-t-0">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sådan ser kunden den</p>
                <EmailPreview subject={drafts[activeEvent].subject} body={drafts[activeEvent].body} businessName={exampleBizName} />
              </div>
            </div>
          ) : (
            !smsEnabled ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="max-w-sm">
                  <p className="text-sm font-semibold text-foreground">I sender ikke SMS lige nu</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Slå SMS til, hvis I også vil have beskeden landet direkte i kundens lomme — ud over e-mailen.
                    Afsenderen står som "Serviceydere", og vi tilføjer automatisk jeres firmanavn og telefonnummer, så kunden ved hvem det er fra.
                  </p>
                </div>
                <Button size="sm" onClick={() => onSmsEnabledChange(true)}>
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Slå SMS til
                </Button>
              </div>
            ) : (
            <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
              <div className="space-y-4 p-5">
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Send SMS for netop denne besked</p>
                    <p className="text-[11px] text-muted-foreground">Slå fra, hvis I kun vil sende e-mail for denne specifikke hændelse — uden at slå SMS fra for de andre.</p>
                  </div>
                  <Switch
                    checked={smsDrafts[activeEvent].enabled}
                    disabled={!smsEnabled}
                    onCheckedChange={(v) => setSmsDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], enabled: v } }))}
                  />
                </label>

                {activeEvent === "service_upcoming" && (
                  <LeadTimePicker
                    label="Hvornår skal SMS'en sendes?"
                    channel="sms"
                    value={smsDrafts[activeEvent].leadMinutes ?? upcomingMinutesBefore}
                    defaultMinutes={upcomingMinutesBefore}
                    onChange={(m) => setSmsDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], leadMinutes: m } }))}
                    onReset={() => setSmsDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], leadMinutes: null } }))}
                  />
                )}

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">SMS-tekst</Label>
                  <Textarea
                    ref={smsCursor.ref}
                    rows={6}
                    value={smsDrafts[activeEvent].body}
                    disabled={!smsEnabled}
                    maxLength={459}
                    onChange={(ev) => setSmsDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], body: ev.target.value } }))}
                  />
                  <PlaceholderRow onInsert={smsCursor.insert} />
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[11px] font-semibold text-foreground">Vi tilføjer automatisk:</p>
                  <p className="mt-1 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                    <Phone className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>"Denne SMS kan ikke besvares. Kontakt <span className="font-medium text-foreground">{exampleBizName}</span> på <span className="font-medium text-foreground">{exampleBizPhone}</span>."</span>
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resetSms(activeEvent)}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Nulstil tekst
                  </Button>
                  <span className="inline-flex items-center gap-1.5">
                    {smsDirty ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /> Gemmer…</>
                    ) : (
                      <><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Gemmes automatisk</>
                    )}
                  </span>
                </div>
              </div>

              <div className="border-t border-border bg-muted/20 p-5 lg:border-l lg:border-t-0">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sådan ser kunden den</p>
                <SmsPreview body={smsDrafts[activeEvent].body} businessName={exampleBizName} businessPhone={exampleBizPhone} />
              </div>
            </div>
            )
          )}
        </div>
      </div>

      {/* Auto-gem: ingen knap eller sticky bar nødvendig — vi viser status
          inline pr. fane (e-mail/SMS) i bunden af editoren. */}
    </div>
  );
}
