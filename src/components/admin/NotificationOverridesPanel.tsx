import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCircle2, Mail, MessageSquare, Loader2, RotateCcw, Sparkles, Smartphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Genbrugelig panel til at vise/redigere notifikations-overrides for én
 * specifik kunde eller én specifik aftale. Bygger ovenpå virksomhedens
 * default-skabeloner som arve-grundlag.
 *
 * Override-niveauer (lavest → højest prioritet):
 *   1. Virksomhed (customer_notification_templates + notification_settings)
 *   2. Kunde     (scope='customer', match på email)
 *   3. Aftale    (scope='agreement', match på subscription_id)
 */

type EventKey = "service_completed";
type Channel = "email" | "sms";
type Scope = "customer" | "agreement";

const EVENTS: { key: EventKey; label: string; help: string; Icon: typeof Bell }[] = [
  { key: "service_completed", label: "Kvittering efter besøg",  help: "Sendes når opgaven er udført.", Icon: CheckCircle2 },
];

type Row = {
  id: string;
  business_id: string;
  scope: Scope;
  customer_email: string | null;
  subscription_id: string | null;
  event_type: string;
  channel: Channel;
  enabled: boolean | null;
  lead_time_minutes: number | null;
  subject: string | null;
  body: string | null;
};

interface BaseProps {
  businessId: string;
  /** Compact-mode skjuler hjælpe-tekster og bruger tættere padding. */
  compact?: boolean;
  /** Hvis sand, vises kun toggle (ikke skabelon-override). Bruges på kunde-dashboard. */
  toggleOnly?: boolean;
}

interface CustomerScopeProps extends BaseProps {
  scope: "customer";
  customerEmail: string;
  subscriptionId?: never;
}
interface AgreementScopeProps extends BaseProps {
  scope: "agreement";
  subscriptionId: string;
  customerEmail?: string | null;
}

type Props = CustomerScopeProps | AgreementScopeProps;

export default function NotificationOverridesPanel(props: Props) {
  const { businessId, scope, compact = false, toggleOnly = false } = props;
  const customerEmail = scope === "customer" ? props.customerEmail : props.customerEmail ?? null;
  const subscriptionId = scope === "agreement" ? props.subscriptionId : null;
  const qc = useQueryClient();

  const queryKey = ["notif-overrides", businessId, scope, customerEmail ?? null, subscriptionId ?? null];

  // Hent eksisterende overrides for det aktuelle niveau
  const { data: rows, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase.from("notification_overrides").select("*")
        .eq("business_id", businessId)
        .eq("scope", scope);
      if (scope === "customer") q = q.eq("customer_email", customerEmail!);
      if (scope === "agreement") q = q.eq("subscription_id", subscriptionId!);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    enabled: scope === "customer" ? !!customerEmail : !!subscriptionId,
  });

  // Hent virksomhedens default-skabeloner (til preview af "arvet" tekst)
  const { data: defaults } = useQuery({
    queryKey: ["customer-notif-templates", businessId, "for-override"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_notification_templates")
        .select("event_type, channel, enabled, subject, body")
        .eq("business_id", businessId);
      return data ?? [];
    },
  });

  const findRow = (event: EventKey, channel: Channel) =>
    rows?.find((r) => r.event_type === event && r.channel === channel) ?? null;
  const findDefault = (event: EventKey, channel: Channel) =>
    defaults?.find((d: any) => d.event_type === event && d.channel === channel) as
      | { enabled: boolean; subject: string | null; body: string | null }
      | undefined;

  async function upsertOverride(event: EventKey, channel: Channel, patch: Partial<Row>) {
    const existing = findRow(event, channel);
    if (existing) {
      const { error } = await supabase
        .from("notification_overrides")
        .update({ ...patch })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const insert: any = {
        business_id: businessId,
        scope,
        customer_email: scope === "customer" ? customerEmail : (props as AgreementScopeProps).customerEmail ?? null,
        subscription_id: scope === "agreement" ? subscriptionId : null,
        event_type: event,
        channel,
        ...patch,
      };
      const { error } = await supabase.from("notification_overrides").insert(insert);
      if (error) throw error;
    }
    qc.invalidateQueries({ queryKey });
  }

  async function clearOverride(event: EventKey, channel: Channel) {
    const existing = findRow(event, channel);
    if (!existing) return;
    const { error } = await supabase.from("notification_overrides").delete().eq("id", existing.id);
    if (error) throw error;
    qc.invalidateQueries({ queryKey });
    toast.success("Nulstillet — bruger nu standard");
  }

  /**
   * Lead time gælder for hele event'et (samme tidspunkt for både e-mail og SMS),
   * så vi skriver værdien til BEGGE kanal-rækker samtidig. Hvis værdien sættes til
   * null og rækken ikke har andre overrides, fjernes den helt.
   */
  async function setLeadTime(event: EventKey, minutes: number | null) {
    for (const channel of ["email", "sms"] as Channel[]) {
      const existing = findRow(event, channel);
      if (existing) {
        const willBeEmpty =
          minutes == null &&
          existing.enabled == null &&
          !existing.subject &&
          !existing.body;
        if (willBeEmpty) {
          await supabase.from("notification_overrides").delete().eq("id", existing.id);
        } else {
          await supabase
            .from("notification_overrides")
            .update({ lead_time_minutes: minutes })
            .eq("id", existing.id);
        }
      } else if (minutes != null) {
        await supabase.from("notification_overrides").insert({
          business_id: businessId,
          scope,
          customer_email: scope === "customer" ? customerEmail : (props as AgreementScopeProps).customerEmail ?? null,
          subscription_id: scope === "agreement" ? subscriptionId : null,
          event_type: event,
          channel,
          lead_time_minutes: minutes,
        });
      }
    }
    qc.invalidateQueries({ queryKey });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Henter…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {EVENTS.map((ev) => (
        <EventRow
          key={ev.key}
          event={ev}
          emailRow={findRow(ev.key, "email")}
          smsRow={findRow(ev.key, "sms")}
          emailDefault={findDefault(ev.key, "email")}
          smsDefault={findDefault(ev.key, "sms")}
          onPatch={upsertOverride}
          onClear={clearOverride}
          onSetLeadTime={setLeadTime}
          toggleOnly={toggleOnly}
        />
      ))}
      <p className="pt-1 text-[11px] text-muted-foreground">
        {scope === "agreement"
          ? "Gælder kun denne aftale. Overstyrer kunde- og virksomheds­standard."
          : "Gælder denne kunde. Overstyrer virksomheds­standard."}
      </p>
    </div>
  );
}

/* ────────────── EventRow (simpel) ────────────── */

type DefaultTpl = { enabled: boolean; subject: string | null; body: string | null } | undefined;

function EventRow({
  event, emailRow, smsRow, emailDefault, smsDefault, onPatch, onClear, onSetLeadTime, toggleOnly,
}: {
  event: { key: EventKey; label: string; help: string; Icon: typeof Bell };
  emailRow: Row | null;
  smsRow: Row | null;
  emailDefault: DefaultTpl;
  smsDefault: DefaultTpl;
  onPatch: (e: EventKey, c: Channel, p: Partial<Row>) => Promise<void>;
  onClear: (e: EventKey, c: Channel) => Promise<void>;
  onSetLeadTime: (e: EventKey, minutes: number | null) => Promise<void>;
  toggleOnly: boolean;
}) {
  const { Icon } = event;
  const [customizeChannel, setCustomizeChannel] = useState<Channel | null>(null);

  const emailEffective = emailRow?.enabled ?? emailDefault?.enabled ?? true;
  const smsEffective   = smsRow?.enabled   ?? smsDefault?.enabled   ?? true;

  const hasEmailCustom = !!(emailRow?.subject || emailRow?.body || emailRow?.lead_time_minutes != null);
  const hasSmsCustom   = !!(smsRow?.body     || smsRow?.lead_time_minutes != null);

  // Lead time gælder hele event'et — vis den fra hvilken som helst kanal (de er synkroniserede)
  const leadOverride = emailRow?.lead_time_minutes ?? smsRow?.lead_time_minutes ?? null;

  async function toggleChannel(channel: Channel, next: boolean) {
    const row = channel === "email" ? emailRow : smsRow;
    const def = channel === "email" ? emailDefault : smsDefault;
    const defaultEnabled = def?.enabled ?? true;
    const hasCustom = channel === "email" ? hasEmailCustom : hasSmsCustom;

    // Hvis ny værdi matcher standarden og der ikke er anden tilpasning → ryd row (arv)
    if (next === defaultEnabled && !hasCustom) {
      if (row) await onClear(event.key, channel);
      return;
    }
    await onPatch(event.key, channel, { enabled: next });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground leading-tight">{event.label}</p>
          <p className="text-[11px] text-muted-foreground">{event.help}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <ChannelToggle
          icon={<Mail className="h-3.5 w-3.5" />}
          label="E-mail"
          enabled={emailEffective}
          customized={hasEmailCustom || emailRow?.enabled != null}
          onToggle={(v) => toggleChannel("email", v)}
          onCustomize={toggleOnly ? undefined : () => setCustomizeChannel("email")}
        />
        <ChannelToggle
          icon={<MessageSquare className="h-3.5 w-3.5" />}
          label="SMS"
          enabled={smsEffective}
          customized={hasSmsCustom || smsRow?.enabled != null}
          onToggle={(v) => toggleChannel("sms", v)}
          onCustomize={toggleOnly ? undefined : () => setCustomizeChannel("sms")}
        />
      </div>

      <CustomizeSheet
        open={customizeChannel !== null}
        onOpenChange={(o) => !o && setCustomizeChannel(null)}
        channel={customizeChannel ?? "email"}
        eventLabel={event.label}
        eventKey={event.key}
        row={customizeChannel === "email" ? emailRow : smsRow}
        def={customizeChannel === "email" ? emailDefault : smsDefault}
        onPatch={(p) => onPatch(event.key, customizeChannel!, p)}
        onClear={() => onClear(event.key, customizeChannel!)}
      />
    </div>
  );
}

function ChannelToggle({
  icon, label, enabled, customized, onToggle, onCustomize,
}: {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  customized: boolean;
  onToggle: (v: boolean) => Promise<void> | void;
  onCustomize?: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 transition-colors",
        "border-border/80",
        onCustomize && "cursor-pointer hover:border-foreground/30 hover:bg-muted/30",
        !enabled && "opacity-70",
      )}
      onClick={onCustomize}
      role={onCustomize ? "button" : undefined}
      tabIndex={onCustomize ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onCustomize) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCustomize(); }
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-foreground/70">{icon}</span>
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-foreground leading-tight">{label}</p>
          <p className="text-[10.5px] text-muted-foreground">
            {enabled ? "Sendes" : "Sendes ikke"}
            {customized && <span className="ml-1 text-accent">· tilpasset</span>}
          </p>
        </div>
      </div>
      <div
        className="flex items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Switch checked={enabled} onCheckedChange={(v) => onToggle(v)} />
      </div>
    </div>
  );
}

/* ────────────── Customize sheet (avanceret) ────────────── */

function CustomizeSheet({
  open, onOpenChange, channel, eventLabel, eventKey, row, def, onPatch, onClear,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  channel: Channel;
  eventLabel: string;
  eventKey: EventKey;
  row: Row | null;
  def: DefaultTpl;
  onPatch: (p: Partial<Row>) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubject(row?.subject ?? "");
    setBody(row?.body ?? "");
  }, [open, row?.id]);

  const hasCustom = !!(row?.subject || row?.body);

  const isSms = channel === "sms";
  const effectiveSubject = subject || def?.subject || "";
  const effectiveBody = body || def?.body || "";

  const previewSample = (txt: string) =>
    (txt || "(tom)")
      .replace(/\{\{kundens_navn\}\}/g, "Anna")
      .replace(/\{\{service\}\}/g, "Rengøring")
      .replace(/\{\{virksomhed\}\}/g, "Ready2Clean");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="border-b border-border px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {isSms ? <Smartphone className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
            {isSms ? "SMS" : "E-mail"}
          </div>
          <SheetTitle className="mt-1 text-lg leading-tight">
            Tilpas {isSms ? "SMS-besked" : "e-mail"}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {eventLabel}. Lad felter være tomme for at bruge virksomhedens standard.
          </SheetDescription>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {!isSms && (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Emne</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={def?.subject ?? "Standard emne"}
                className="h-10 text-sm"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {isSms ? "SMS-tekst" : "Besked"}
              </label>
              {isSms && (
                <span className={cn(
                  "text-[10.5px] tabular-nums",
                  body.length > 160 ? "text-destructive" : "text-muted-foreground",
                )}>
                  {body.length}/160 tegn
                </span>
              )}
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={def?.body ?? "Standard tekst"}
              rows={isSms ? 4 : 7}
              className="text-sm resize-none leading-relaxed"
            />

            {/* Variable chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10.5px] text-muted-foreground self-center mr-1">Indsæt:</span>
              {[
                { k: "{{kundens_navn}}", l: "Kundenavn" },
                { k: "{{service}}", l: "Service" },
                { k: "{{virksomhed}}", l: "Virksomhed" },
              ].map((v) => (
                <button
                  key={v.k}
                  type="button"
                  onClick={() => setBody((b) => (b || def?.body || "") + " " + v.k)}
                  className="rounded-full border border-border bg-background px-2 py-0.5 text-[10.5px] text-foreground/80 transition-colors hover:border-foreground/40 hover:bg-muted"
                >
                  + {v.l}
                </button>
              ))}
            </div>
          </div>

          {/* Live preview */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Forhåndsvisning
            </p>
            {isSms ? (
              <div className="rounded-2xl bg-muted/50 p-4">
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-3.5 py-2.5 text-[12.5px] leading-snug text-background shadow-sm whitespace-pre-wrap break-words">
                  {previewSample(effectiveBody)}
                </div>
                <p className="mt-2 text-right text-[10px] text-muted-foreground">Sendes fra virksomhedens nummer</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-background">
                <div className="border-b border-border px-3.5 py-2">
                  <p className="text-[10.5px] text-muted-foreground">Emne</p>
                  <p className="text-[13px] font-semibold text-foreground truncate">
                    {previewSample(effectiveSubject) || "(tom)"}
                  </p>
                </div>
                <div className="px-3.5 py-3 text-[12.5px] leading-relaxed text-foreground whitespace-pre-wrap">
                  {previewSample(effectiveBody)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-3">
          {hasCustom ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={async () => {
                await onClear();
                toast.success("Nulstillet til standard");
                onOpenChange(false);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Nulstil
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
              Annullér
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onPatch({
                    subject: channel === "email" ? (subject.trim() || null) : null,
                    body: body.trim() || null,
                  });
                  toast.success("Gemt");
                  onOpenChange(false);
                } catch (e: any) {
                  toast.error(e?.message ?? "Kunne ikke gemme");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              Gem
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ────────────── LeadTimePicker (inline) ────────────── */

const LEAD_PRESETS = [
  { v: 15, label: "15 min" },
  { v: 30, label: "30 min" },
  { v: 60, label: "1 t" },
  { v: 120, label: "2 t" },
  { v: 240, label: "4 t" },
  { v: 1440, label: "1 dag" },
] as const;

function formatLead(mins: number): string {
  if (mins < 60) return `${mins} min`;
  if (mins < 1440) {
    const h = mins / 60;
    return Number.isInteger(h) ? `${h} t` : `${h.toFixed(1)} t`;
  }
  const d = mins / 1440;
  return Number.isInteger(d) ? `${d} dag${d === 1 ? "" : "e"}` : `${d.toFixed(1)} dage`;
}

function LeadTimePicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (mins: number | null) => Promise<void> | void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const isPreset = value != null && LEAD_PRESETS.some((p) => p.v === value);
  const isCustom = value != null && !isPreset;

  return (
    <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <Bell className="h-3 w-3" /> Hvornår
        </div>
        <span className="text-[11px] text-foreground/70">
          {value == null ? "Bruger standard" : `${formatLead(value)} før`}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => { setCustomOpen(false); onChange(null); }}
          className={cn(
            "rounded-md border px-2.5 py-1 text-[11.5px] font-medium transition-colors",
            value == null
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background text-foreground hover:border-foreground/40",
          )}
        >
          Standard
        </button>
        {LEAD_PRESETS.map((p) => {
          const active = value === p.v;
          return (
            <button
              key={p.v}
              type="button"
              onClick={() => { setCustomOpen(false); onChange(p.v); }}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-foreground hover:border-foreground/40",
              )}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setCustom(isCustom ? String(value) : "");
            setCustomOpen((o) => !o);
          }}
          className={cn(
            "rounded-md border px-2.5 py-1 text-[11.5px] font-medium transition-colors",
            isCustom || customOpen
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background text-foreground hover:border-foreground/40",
          )}
        >
          Eget…
        </button>
      </div>

      {customOpen && (
        <div className="mt-2 flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={20160}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Antal"
            className="h-8 w-24 text-sm"
            autoFocus
          />
          <span className="text-[11px] text-muted-foreground">minutter før</span>
          <Button
            type="button"
            size="sm"
            className="h-8 text-[11px] ml-auto"
            onClick={async () => {
              const n = Math.max(0, Math.min(20160, Number(custom) || 0));
              await onChange(n);
              setCustomOpen(false);
            }}
          >
            Anvend
          </Button>
        </div>
      )}
    </div>
  );
}