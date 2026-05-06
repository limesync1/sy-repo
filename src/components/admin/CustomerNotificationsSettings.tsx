import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Mail, MessageSquare, Clock, Bell, CheckCircle2, RotateCcw, Phone, Plus, AlarmClock, Signal, Wifi, BatteryFull, ChevronLeft, Video } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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

/* ─────────────────────── LEAD TIME HELPERS ─────────────────────── */

type LeadParts = { d: number; h: number; m: number };

const minutesToParts = (mins: number | null | undefined): LeadParts => {
  const total = Math.max(0, Math.floor(mins ?? 0));
  const d = Math.floor(total / (24 * 60));
  const h = Math.floor((total - d * 24 * 60) / 60);
  const m = total - d * 24 * 60 - h * 60;
  return { d, h, m };
};
const partsToMinutes = (p: LeadParts): number => Math.max(0, (p.d || 0) * 24 * 60 + (p.h || 0) * 60 + (p.m || 0));
const formatLead = (mins: number): string => {
  if (!mins || mins <= 0) return "med det samme";
  const { d, h, m } = minutesToParts(mins);
  const parts: string[] = [];
  if (d) parts.push(`${d} dag${d > 1 ? "e" : ""}`);
  if (h) parts.push(`${h} time${h > 1 ? "r" : ""}`);
  if (m) parts.push(`${m} min`);
  return parts.join(" og ");
};

const LEAD_PRESETS: { label: string; minutes: number }[] = [
  { label: "30 min", minutes: 30 },
  { label: "1 time", minutes: 60 },
  { label: "2 timer", minutes: 120 },
  { label: "4 timer", minutes: 240 },
  { label: "1 dag", minutes: 24 * 60 },
  { label: "2 dage", minutes: 48 * 60 },
  { label: "1 uge", minutes: 7 * 24 * 60 },
];

function LeadTimePicker({
  value, onChange, defaultMinutes, onReset, label, channel,
}: {
  value: number; onChange: (m: number) => void;
  defaultMinutes: number; onReset: () => void;
  label: string; channel: "email" | "sms";
}) {
  const parts = minutesToParts(value);
  const usingDefault = value === defaultMinutes;
  const setPart = (k: keyof LeadParts, v: number) => {
    const max = k === "m" ? 59 : k === "h" ? 23 : 30;
    const next: LeadParts = { ...parts, [k]: Math.max(0, Math.min(max, Number.isFinite(v) ? v : 0)) };
    onChange(partsToMinutes(next));
  };
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlarmClock className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[12px] font-semibold text-foreground">{label}</p>
        </div>
        <span className="rounded-md bg-background px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
          {channel === "email" ? "E-mail" : "SMS"}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Sendes <span className="font-medium text-foreground">{formatLead(value)}</span> før det planlagte tidspunkt.
      </p>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {LEAD_PRESETS.map((p) => {
          const active = value === p.minutes;
          return (
            <button
              key={p.minutes}
              type="button"
              onClick={() => onChange(p.minutes)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:border-foreground/50",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {([
          { k: "d" as const, label: "Dage" , max: 30 },
          { k: "h" as const, label: "Timer", max: 23 },
          { k: "m" as const, label: "Min"  , max: 59 },
        ]).map((f) => (
          <label key={f.k} className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{f.label}</span>
            <Input
              type="number" min={0} max={f.max}
              value={parts[f.k]}
              className="h-9"
              onChange={(e) => setPart(f.k, Number(e.target.value))}
            />
          </label>
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-[10.5px] text-muted-foreground">
          {usingDefault ? "Bruger jeres standard" : `Standard: ${formatLead(defaultMinutes)}`}
        </span>
        {!usingDefault && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" /> Brug standard
          </button>
        )}
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
  // Authentisk iOS-look: mørk bezel med dynamic island, status-bar med ur+ikoner,
  // navigation-bar med tilbage-knap + kontakt-avatar, modtaget-besked som grå
  // boble til venstre med "tail" og afsender-label/timestamp ovenover.
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative overflow-hidden rounded-[44px] bg-[#0a0a0a] p-[10px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.4)]"
        style={{ width: 300 }}
      >
        {/* Phone screen */}
        <div className="relative overflow-hidden rounded-[34px] bg-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
          {/* Status bar */}
          <div className="relative flex items-center justify-between bg-white px-6 pb-1 pt-2 text-[12px] font-semibold text-black">
            <span>9:41</span>
            {/* Dynamic island */}
            <div className="absolute left-1/2 top-1.5 h-[22px] w-[88px] -translate-x-1/2 rounded-full bg-black" />
            <div className="flex items-center gap-1">
              <Signal className="h-3 w-3" strokeWidth={2.5} />
              <Wifi className="h-3 w-3" strokeWidth={2.5} />
              <BatteryFull className="h-3.5 w-3.5" strokeWidth={2} />
            </div>
          </div>

          {/* Navigation bar — Messages style */}
          <div className="relative flex items-center justify-between border-b border-[#e5e5ea] bg-[#f6f6f6]/95 px-2 py-2 backdrop-blur">
            <button type="button" className="flex items-center gap-0.5 text-[#007aff]">
              <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
              <span className="rounded-full bg-[#ff3b30] px-1.5 text-[10px] font-semibold text-white">3</span>
            </button>
            <div className="flex flex-1 flex-col items-center gap-0.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-[#3a3a3c] to-[#1c1c1e] text-[11px] font-semibold text-white">
                {(businessName || "S").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex items-center gap-0.5 text-[9.5px] font-medium text-[#1c1c1e]">
                Serviceydere
                <ChevronLeft className="h-2.5 w-2.5 -rotate-90 text-[#8e8e93]" />
              </div>
            </div>
            <Video className="h-5 w-5 text-[#007aff]" strokeWidth={2} />
          </div>

          {/* Conversation */}
          <div className="min-h-[220px] bg-white px-3 pb-4 pt-3">
            <div className="mb-2 text-center text-[10px] font-semibold text-[#8e8e93]">
              <span className="font-bold text-[#3c3c43]">Tekstbesked</span>
              <span className="ml-1.5 font-normal">i dag 9.41</span>
            </div>
            {/* Modtaget besked — grå boble venstre med tail */}
            <div className="relative flex max-w-[82%] items-end">
              <div className="relative whitespace-pre-wrap rounded-[18px] bg-[#e9e9eb] px-3 py-2 text-[12.5px] leading-[1.35] text-[#000000]">
                {full}
                {/* Bubble tail (venstre side, lille kurve) */}
                <span
                  aria-hidden
                  className="absolute -bottom-[1px] -left-[6px] h-[18px] w-[14px] bg-[#e9e9eb]"
                  style={{ clipPath: "path('M14 18 C 6 18 0 12 0 0 L 14 0 Z')" }}
                />
              </div>
            </div>
          </div>

          {/* Home indicator */}
          <div className="flex justify-center bg-white pb-1.5 pt-1">
            <div className="h-1 w-24 rounded-full bg-black/80" />
          </div>
        </div>
      </div>

      {/* Stats nedenunder */}
      <div className="mt-3 flex w-full max-w-[300px] items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-[10.5px] text-muted-foreground">
        <span><span className="font-semibold text-foreground">{charCount}</span> tegn</span>
        <span><span className="font-semibold text-foreground">{smsCount}</span> SMS{smsCount > 1 ? "'er" : ""} <span className="text-[#a3a3a3]">(160/SMS)</span></span>
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
  businessId, upcomingHoursBefore, onUpcomingHoursChange,
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

  const [drafts, setDrafts] = useState<Record<EventKey, { subject: string; body: string; enabled: boolean; leadMinutes: number | null }>>(() => {
    const o = {} as any;
    EVENTS.forEach((e) => { o[e.key] = { subject: e.defaults.subject, body: e.defaults.body, enabled: true, leadMinutes: null }; });
    return o;
  });
  const [smsDrafts, setSmsDrafts] = useState<Record<EventKey, { body: string; enabled: boolean; leadMinutes: number | null }>>(() => {
    const o = {} as any;
    EVENTS.forEach((e) => { o[e.key] = { body: SMS_DEFAULTS[e.key], enabled: true, leadMinutes: null }; });
    return o;
  });
  const [savedSnapshot, setSavedSnapshot] = useState<{ email: typeof drafts; sms: typeof smsDrafts } | null>(null);

  const [activeEvent, setActiveEvent] = useState<EventKey>("service_upcoming");
  const [channelTab, setChannelTab] = useState<"email" | "sms">("email");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!rows) return;
    const nextEmail = { ...drafts };
    const nextSms = { ...smsDrafts };
    for (const e of EVENTS) {
      const eRow = rows.find((r: any) => r.event_type === e.key && (r.channel ?? "email") === "email");
      if (eRow) nextEmail[e.key] = { subject: eRow.subject, body: eRow.body, enabled: eRow.enabled, leadMinutes: eRow.lead_time_minutes ?? null };
      const sRow = rows.find((r: any) => r.event_type === e.key && r.channel === "sms");
      if (sRow) nextSms[e.key] = { body: sRow.body, enabled: sRow.enabled, leadMinutes: sRow.lead_time_minutes ?? null };
    }
    setDrafts(nextEmail);
    setSmsDrafts(nextSms);
    setSavedSnapshot({ email: nextEmail, sms: nextSms });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const isEmailDirty = (k: EventKey) => {
    const a = drafts[k]; const b = savedSnapshot?.email[k];
    if (!b) return true;
    return a.subject !== b.subject || a.body !== b.body || a.enabled !== b.enabled || a.leadMinutes !== b.leadMinutes;
  };
  const isSmsDirty = (k: EventKey) => {
    const a = smsDrafts[k]; const b = savedSnapshot?.sms[k];
    if (!b) return true;
    return a.body !== b.body || a.enabled !== b.enabled || a.leadMinutes !== b.leadMinutes;
  };

  const save = async (key: EventKey) => {
    setSaving(`email-${key}`);
    const d = drafts[key];
    const { error } = await supabase
      .from("customer_notification_templates")
      .upsert({ business_id: businessId, event_type: key, channel: "email",
        subject: d.subject, body: d.body, enabled: d.enabled, lead_time_minutes: d.leadMinutes }, { onConflict: "business_id,event_type,channel" });
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success("E-mail gemt");
    setSavedSnapshot((s) => ({ email: { ...(s?.email ?? drafts), [key]: d }, sms: s?.sms ?? smsDrafts }));
    qc.invalidateQueries({ queryKey: ["customer-notif-templates", businessId] });
  };

  const saveSms = async (key: EventKey) => {
    setSaving(`sms-${key}`);
    const d = smsDrafts[key];
    const { error } = await supabase
      .from("customer_notification_templates")
      .upsert({ business_id: businessId, event_type: key, channel: "sms",
        subject: null, body: d.body, enabled: d.enabled, lead_time_minutes: d.leadMinutes }, { onConflict: "business_id,event_type,channel" });
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success("SMS gemt");
    setSavedSnapshot((s) => ({ email: s?.email ?? drafts, sms: { ...(s?.sms ?? smsDrafts), [key]: d } }));
    qc.invalidateQueries({ queryKey: ["customer-notif-templates", businessId] });
  };

  const resetEmail = (key: EventKey) => {
    const ev = EVENTS.find((e) => e.key === key)!;
    setDrafts((p) => ({ ...p, [key]: { subject: ev.defaults.subject, body: ev.defaults.body, enabled: p[key].enabled } }));
  };
  const resetSms = (key: EventKey) => {
    setSmsDrafts((p) => ({ ...p, [key]: { body: SMS_DEFAULTS[key], enabled: p[key].enabled } }));
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
  const anyDirty = EVENTS.some((e) => isEmailDirty(e.key) || isSmsDirty(e.key));

  // Advar hvis brugeren forlader siden med ugemte ændringer
  useEffect(() => {
    if (!anyDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [anyDirty]);

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* ───── Globale indstillinger ───── */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Standard-tid før besøg — bruger samme presets som per-besked LeadTimePicker
            men rundes til hele timer fordi parent gemmer i timer (1–168). */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5">
              <Clock className="h-4 w-4 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Standardtid før besøget</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Bruges som udgangspunkt for alle påmindelser. I kan altid vælge en anden tid for hver enkelt e-mail og SMS længere nede.
              </p>
              <p className="mt-2 text-[12px] text-foreground">
                Sender påmindelser <span className="font-semibold">{formatLead(upcomingHoursBefore * 60)}</span> før det planlagte besøg.
              </p>
              {/* Presets (i timer) */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[
                  { label: "1 time", h: 1 },
                  { label: "2 timer", h: 2 },
                  { label: "4 timer", h: 4 },
                  { label: "12 timer", h: 12 },
                  { label: "1 dag", h: 24 },
                  { label: "2 dage", h: 48 },
                  { label: "1 uge", h: 168 },
                ].map((p) => {
                  const active = upcomingHoursBefore === p.h;
                  return (
                    <button
                      key={p.h}
                      type="button"
                      onClick={() => onUpcomingHoursChange(p.h)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background text-foreground hover:border-foreground/50",
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              {/* Brugerdefineret */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Dage</span>
                  <Input
                    type="number" min={0} max={7} className="h-9"
                    value={Math.floor(upcomingHoursBefore / 24)}
                    onChange={(e) => {
                      const d = Math.max(0, Math.min(7, Number(e.target.value) || 0));
                      const h = upcomingHoursBefore % 24;
                      onUpcomingHoursChange(Math.max(1, Math.min(168, d * 24 + h)));
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Timer</span>
                  <Input
                    type="number" min={0} max={23} className="h-9"
                    value={upcomingHoursBefore % 24}
                    onChange={(e) => {
                      const h = Math.max(0, Math.min(23, Number(e.target.value) || 0));
                      const d = Math.floor(upcomingHoursBefore / 24);
                      onUpcomingHoursChange(Math.max(1, Math.min(168, d * 24 + h)));
                    }}
                  />
                </label>
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
                        {formatLead(drafts[e.key].leadMinutes ?? upcomingHoursBefore * 60)}
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
                  <LeadTimePicker
                    label="Hvornår skal e-mailen sendes?"
                    channel="email"
                    value={drafts[activeEvent].leadMinutes ?? upcomingHoursBefore * 60}
                    defaultMinutes={upcomingHoursBefore * 60}
                    onChange={(m) => setDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], leadMinutes: m } }))}
                    onReset={() => setDrafts((p) => ({ ...p, [activeEvent]: { ...p[activeEvent], leadMinutes: null } }))}
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

                <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resetEmail(activeEvent)}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Nulstil tekst
                  </Button>
                  <Button size="sm" onClick={() => save(activeEvent)} disabled={!emailDirty || saving === `email-${activeEvent}`}>
                    {saving === `email-${activeEvent}` ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                    {emailDirty ? "Gem ændringer" : "Gemt"}
                  </Button>
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
                    value={smsDrafts[activeEvent].leadMinutes ?? upcomingHoursBefore * 60}
                    defaultMinutes={upcomingHoursBefore * 60}
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

                <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resetSms(activeEvent)}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Nulstil tekst
                  </Button>
                  <Button size="sm" disabled={!smsEnabled || !smsDirty || saving === `sms-${activeEvent}`} onClick={() => saveSms(activeEvent)}>
                    {saving === `sms-${activeEvent}` ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                    {smsDirty ? "Gem ændringer" : "Gemt"}
                  </Button>
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

      {/* Sticky save-bar — vises kun når der er ugemte ændringer */}
      {anyDirty && (
        <div className="sticky bottom-3 z-10 mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-full border border-border bg-card px-4 py-2 shadow-lg">
          <div className="flex items-center gap-2 text-xs text-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            <span className="font-medium">Du har ugemte ændringer</span>
          </div>
          <div className="flex items-center gap-2">
            {channelTab === "email" && emailDirty && (
              <Button size="sm" onClick={() => save(activeEvent)} disabled={saving === `email-${activeEvent}`}>
                {saving === `email-${activeEvent}` ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                Gem e-mail
              </Button>
            )}
            {channelTab === "sms" && smsDirty && smsEnabled && (
              <Button size="sm" onClick={() => saveSms(activeEvent)} disabled={saving === `sms-${activeEvent}`}>
                {saving === `sms-${activeEvent}` ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                Gem SMS
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
