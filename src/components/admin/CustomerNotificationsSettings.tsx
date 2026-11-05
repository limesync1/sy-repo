import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Mail, MessageSquare, Bell, CheckCircle2, RotateCcw, Phone, Plus, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FieldLabel } from "@/components/admin/shared/AdminUI";
import { LeadTimeChooser } from "@/components/admin/shared/LeadTimeChooser";

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
    label: "Påmindelse før besøg",
    shortLabel: "Sendes før vi kommer",
    help: "En påmindelse til kunden før besøget. Vælg under «Hvornår», hvor længe før den sendes — ikke et aftalt besøgstidspunkt.",
    Icon: Bell,
    defaults: {
      subject: "Vi kommer og udfører {{service}}",
      body: "Hej {{kundens_navn}},\n\nVi kommer forbi {{tidspunkt}} og udfører {{service}}.\n\nVi glæder os til at se dig.\n\nVenlig hilsen,\n{{firmanavn}}",
    },
  },
  {
    key: "service_completed",
    label: "Kvittering efter besøg",
    shortLabel: "Sendes når aftalen er færdig",
    help: "En kvittering til kunden når besøget er udført. Sendes automatisk så snart medarbejderen markerer aftalen som færdig.",
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
  { key: "tidspunkt", label: "Besøgsdato", example: "tirsdag 20. oktober" },
];

// Mapping: dansk eller gammelt engelsk navn → eksempel-værdi
const ALIASES: Record<string, string> = {
  kundens_navn: "kundens_navn", customer_name: "kundens_navn",
  firmanavn: "firmanavn", business_name: "firmanavn",
  telefon: "telefon", business_phone: "telefon",
  service: "service", service_name: "service",
  tidspunkt: "tidspunkt",
};
const EXAMPLE_VARS: Record<string, string> = Object.fromEntries(PLACEHOLDERS.map((p) => [p.key, p.example]));

function renderPreview(tpl: string): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
    const canonical = ALIASES[k] ?? k;
    return EXAMPLE_VARS[canonical] ?? `{{${k}}}`;
  });
}

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

  type EmailDraft = { subject: string; body: string; enabled: boolean };
  type SmsDraft   = { body: string; enabled: boolean };
  const [drafts, setDrafts] = useState<Record<EventKey, EmailDraft>>(() => {
    const o = {} as any;
    EVENTS.forEach((e) => { o[e.key] = { subject: e.defaults.subject, body: e.defaults.body, enabled: true }; });
    return o;
  });
  const [smsDrafts, setSmsDrafts] = useState<Record<EventKey, SmsDraft>>(() => {
    const o = {} as any;
    EVENTS.forEach((e) => { o[e.key] = { body: SMS_DEFAULTS[e.key], enabled: true }; });
    return o;
  });
  const [savedSnapshot, setSavedSnapshot] = useState<{ email: typeof drafts; sms: typeof smsDrafts } | null>(null);

  const [editing, setEditing] = useState<EventKey | null>(null);
  const activeEvent: EventKey = editing ?? "service_upcoming";
  // Auto-save state — vi gemmer i baggrunden uden knapper.

  useEffect(() => {
    if (!rows) return;
    const nextEmail = { ...drafts };
    const nextSms = { ...smsDrafts };
    for (const e of EVENTS) {
      const eRow = rows.find((r: any) => r.event_type === e.key && (r.channel ?? "email") === "email");
      if (eRow) {
        nextEmail[e.key] = {
          subject: eRow.subject, body: eRow.body, enabled: eRow.enabled,
        };
      }
      const sRow = rows.find((r: any) => r.event_type === e.key && r.channel === "sms");
      if (sRow) {
        nextSms[e.key] = {
          body: sRow.body, enabled: sRow.enabled,
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
    return a.subject !== b.subject || a.body !== b.body || a.enabled !== b.enabled;
  };
  const isSmsDirty = (k: EventKey) => {
    const a = smsDrafts[k]; const b = savedSnapshot?.sms[k];
    if (!b) return true;
    return a.body !== b.body || a.enabled !== b.enabled;
  };

  const saveEmailNow = async (key: EventKey, d: EmailDraft) => {
    const { error } = await supabase
      .from("customer_notification_templates")
      .upsert({ business_id: businessId, event_type: key, channel: "email",
        subject: d.subject, body: d.body, enabled: d.enabled,
        lead_time_minutes: null, days_before: null, send_at_time: null,
      } as any, { onConflict: "business_id,event_type,channel" });
    if (error) { toast.error(error.message); return; }
    setSavedSnapshot((s) => ({ email: { ...(s?.email ?? drafts), [key]: d }, sms: s?.sms ?? smsDrafts }));
  };

  const saveSmsNow = async (key: EventKey, d: SmsDraft) => {
    const { error } = await supabase
      .from("customer_notification_templates")
      .upsert({ business_id: businessId, event_type: key, channel: "sms",
        subject: null, body: d.body, enabled: d.enabled,
        lead_time_minutes: null, days_before: null, send_at_time: null,
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

  const exampleBizName = businessInfo?.name?.trim() || EXAMPLE_VARS.firmanavn;
  const exampleBizPhone = businessInfo?.phone?.trim() || EXAMPLE_VARS.telefon;
  const anyDirty = EVENTS.some((e) => isEmailDirty(e.key) || isSmsDirty(e.key));

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
    return (
      <div className="space-y-3" role="status" aria-label="Indlæser kundebeskeder">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-16 w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {EVENTS.map((e) => {
        const d = drafts[e.key];
        const sd = smsDrafts[e.key];
        const smsOn = sd.enabled && smsEnabled;
        const open = editing === e.key;
        const Icon = e.Icon;
        const smsLen = sd.body.length;
        return (
          <section key={e.key} className="overflow-hidden rounded-md border border-border bg-card">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h4 className="text-base font-semibold text-foreground">{e.label}</h4>
                  <p className="text-sm text-muted-foreground">{e.shortLabel}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ChannelChip
                  label="E-mail" icon={Mail} on={d.enabled}
                  onClick={() => setDrafts((p) => ({ ...p, [e.key]: { ...p[e.key], enabled: !p[e.key].enabled } }))}
                />
                <ChannelChip
                  label="SMS" icon={MessageSquare} on={smsOn}
                  onClick={() => {
                    if (!smsEnabled) {
                      onSmsEnabledChange(true);
                      setSmsDrafts((p) => ({ ...p, [e.key]: { ...p[e.key], enabled: true } }));
                      return;
                    }
                    setSmsDrafts((p) => ({ ...p, [e.key]: { ...p[e.key], enabled: !p[e.key].enabled } }));
                  }}
                />
                <Button type="button" variant="outline" className="min-h-11" aria-expanded={open}
                  onClick={() => setEditing(open ? null : e.key)}>
                  <Pencil className="h-4 w-4" /> {open ? "Luk" : "Ret tekst"}
                </Button>
              </div>
            </div>

            {e.key === "service_upcoming" && d.enabled && (
              <div className="flex flex-col gap-2 border-t border-border px-4 py-3 sm:flex-row sm:items-center">
                <span className="shrink-0 text-sm font-medium text-foreground">Send påmindelsen</span>
                <LeadTimeChooser compact value={upcomingMinutesBefore} onChange={(m) => m != null && onUpcomingMinutesChange(m)} />
              </div>
            )}

            {open && (
              <div className="space-y-4 border-t border-border bg-muted/20 p-4">
                {d.enabled && (
                  <div className="space-y-2">
                    <FieldLabel htmlFor={`cn-subj-${e.key}`}>E-mailens emne</FieldLabel>
                    <Input id={`cn-subj-${e.key}`} ref={subjectCursor.ref} className="h-11" value={d.subject}
                      onChange={(ev) => setDrafts((p) => ({ ...p, [e.key]: { ...p[e.key], subject: ev.target.value } }))} />
                    <FieldLabel htmlFor={`cn-body-${e.key}`}>E-mailens tekst</FieldLabel>
                    <Textarea id={`cn-body-${e.key}`} ref={bodyCursor.ref} rows={6} value={d.body}
                      onChange={(ev) => setDrafts((p) => ({ ...p, [e.key]: { ...p[e.key], body: ev.target.value } }))} />
                    <PlaceholderRow onInsert={bodyCursor.insert} />
                  </div>
                )}
                {smsOn && (
                  <div className="space-y-2">
                    <FieldLabel htmlFor={`cn-sms-${e.key}`}>SMS-tekst</FieldLabel>
                    <Textarea id={`cn-sms-${e.key}`} ref={smsCursor.ref} rows={3} maxLength={459} value={sd.body}
                      onChange={(ev) => setSmsDrafts((p) => ({ ...p, [e.key]: { ...p[e.key], body: ev.target.value } }))} />
                    <PlaceholderRow onInsert={smsCursor.insert} />
                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Phone className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>{smsLen} tegn. Vi tilføjer selv: "Kontakt {exampleBizName} på {exampleBizPhone}."</span>
                    </p>
                  </div>
                )}
                {!d.enabled && !smsOn && (
                  <p className="text-sm text-muted-foreground">Slå e-mail eller SMS til for at rette teksten.</p>
                )}
                <Button type="button" variant="ghost" className="min-h-11 text-muted-foreground"
                  onClick={() => { resetEmail(e.key); resetSms(e.key); }}>
                  <RotateCcw className="h-4 w-4" /> Brug standardteksten
                </Button>
              </div>
            )}
          </section>
        );
      })}
      <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
        {anyDirty ? <><Loader2 className="h-3 w-3 animate-spin" /> Gemmer…</> : <><CheckCircle2 className="h-3 w-3" /> Teksterne gemmes automatisk. Beskeden viser kun dato, aldrig klokkeslæt.</>}
      </p>
    </div>
  );
}

function ChannelChip({ label, icon: Icon, on, onClick }: { label: string; icon: typeof Mail; on: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
        on ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground hover:border-foreground/40",
      )}>
      <Icon className="h-4 w-4" /> {label} {on ? "til" : "fra"}
    </button>
  );
}
