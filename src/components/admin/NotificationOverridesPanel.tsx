import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCircle2, Mail, MessageSquare, Loader2, RotateCcw, Settings2 } from "lucide-react";
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

type EventKey = "service_upcoming" | "service_completed";
type Channel = "email" | "sms";
type Scope = "customer" | "agreement";

const EVENTS: { key: EventKey; label: string; help: string; Icon: typeof Bell }[] = [
  { key: "service_upcoming",  label: "Påmindelse inden besøg", help: "Sendes kort før vi kommer.", Icon: Bell },
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
  event, emailRow, smsRow, emailDefault, smsDefault, onPatch, onClear, toggleOnly,
}: {
  event: { key: EventKey; label: string; help: string; Icon: typeof Bell };
  emailRow: Row | null;
  smsRow: Row | null;
  emailDefault: DefaultTpl;
  smsDefault: DefaultTpl;
  onPatch: (e: EventKey, c: Channel, p: Partial<Row>) => Promise<void>;
  onClear: (e: EventKey, c: Channel) => Promise<void>;
  toggleOnly: boolean;
}) {
  const { Icon } = event;
  const [customizeChannel, setCustomizeChannel] = useState<Channel | null>(null);

  const emailEffective = emailRow?.enabled ?? emailDefault?.enabled ?? true;
  const smsEffective   = smsRow?.enabled   ?? smsDefault?.enabled   ?? true;

  const hasEmailCustom = !!(emailRow?.subject || emailRow?.body || emailRow?.lead_time_minutes != null);
  const hasSmsCustom   = !!(smsRow?.body     || smsRow?.lead_time_minutes != null);

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
    <div className={cn(
      "flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2",
      enabled ? "border-border" : "border-border/70 opacity-80",
    )}>
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
      <div className="flex items-center gap-1">
        {onCustomize && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onCustomize}
            title="Tilpas tekst"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        )}
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
  const [leadMins, setLeadMins] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubject(row?.subject ?? "");
    setBody(row?.body ?? "");
    setLeadMins(row?.lead_time_minutes != null ? String(row.lead_time_minutes) : "");
  }, [open, row?.id]);

  const hasCustom = !!(row?.subject || row?.body || row?.lead_time_minutes != null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-base">
            Tilpas {channel === "email" ? "e-mail" : "SMS"}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {eventLabel} · Lad felter være tomme for at bruge virksomhedens standard.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {channel === "email" && (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Emne</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={def?.subject ?? "Standard emne"}
                className="h-9 text-sm"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Besked</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={def?.body ?? "Standard tekst"}
              rows={6}
              className="text-sm resize-none"
            />
            <p className="mt-1 text-[10.5px] text-muted-foreground">
              Variabler: <code className="text-foreground/80">{"{{kundens_navn}}"}</code>,{" "}
              <code className="text-foreground/80">{"{{service}}"}</code>,{" "}
              <code className="text-foreground/80">{"{{tidspunkt}}"}</code>
            </p>
          </div>
          {eventKey === "service_upcoming" && (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Minutter før besøg
              </label>
              <Input
                type="number"
                min={0}
                max={20160}
                value={leadMins}
                onChange={(e) => setLeadMins(e.target.value)}
                placeholder="Tomt = standard"
                className="h-9 text-sm w-40"
              />
            </div>
          )}
        </div>

        <SheetFooter className="flex-row justify-between gap-2 sm:justify-between border-t pt-3">
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
                  const mins = leadMins.trim() === "" ? null : Math.max(0, Math.min(20160, Number(leadMins) || 0));
                  await onPatch({
                    subject: channel === "email" ? (subject.trim() || null) : null,
                    body: body.trim() || null,
                    lead_time_minutes: mins,
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
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}