import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCircle2, Mail, MessageSquare, Loader2, RotateCcw, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  { key: "service_upcoming",  label: "Påmindelse inden besøg", help: "Sendes inden vi kommer forbi.", Icon: Bell },
  { key: "service_completed", label: "Kvittering efter besøg",  help: "Sendes når besøget er udført.", Icon: CheckCircle2 },
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
    <div className={cn("space-y-3", compact ? "" : "space-y-4")}>
      {!compact && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-[12px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/60" />
          <p>
            {scope === "customer"
              ? "Disse indstillinger tilsidesætter virksomhedens standard for denne kunde. Tom = arv standard."
              : "Disse indstillinger gælder kun for denne aftale og tilsidesætter både virksomhedens standard og kundens overrides."}
          </p>
        </div>
      )}
      {EVENTS.map((ev) => (
        <EventCard
          key={ev.key}
          event={ev}
          emailRow={findRow(ev.key, "email")}
          smsRow={findRow(ev.key, "sms")}
          emailDefault={findDefault(ev.key, "email")}
          smsDefault={findDefault(ev.key, "sms")}
          onPatch={upsertOverride}
          onClear={clearOverride}
          scope={scope}
          toggleOnly={toggleOnly}
        />
      ))}
    </div>
  );
}

/* ────────────── EventCard ────────────── */

function EventCard({
  event, emailRow, smsRow, emailDefault, smsDefault, onPatch, onClear, scope, toggleOnly,
}: {
  event: { key: EventKey; label: string; help: string; Icon: typeof Bell };
  emailRow: Row | null;
  smsRow: Row | null;
  emailDefault?: { enabled: boolean; subject: string | null; body: string | null };
  smsDefault?: { enabled: boolean; subject: string | null; body: string | null };
  onPatch: (e: EventKey, c: Channel, p: Partial<Row>) => Promise<void>;
  onClear: (e: EventKey, c: Channel) => Promise<void>;
  scope: Scope;
  toggleOnly: boolean;
}) {
  const { Icon } = event;
  const [channel, setChannel] = useState<Channel>("email");
  const row = channel === "email" ? emailRow : smsRow;
  const def = channel === "email" ? emailDefault : smsDefault;

  const effectiveEnabled = row?.enabled ?? def?.enabled ?? true;
  const status: "inherit" | "custom" | "off" =
    row?.enabled === false ? "off"
    : row && (row.enabled === true || row.subject || row.body) ? "custom"
    : "inherit";

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="h-3.5 w-3.5 text-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground leading-tight">{event.label}</p>
            <p className="text-[11px] text-muted-foreground">{event.help}</p>
          </div>
        </div>
        <StatusBadge status={status} scope={scope} />
      </div>

      <Tabs value={channel} onValueChange={(v) => setChannel(v as Channel)} className="mt-3">
        <TabsList className="grid h-8 w-full grid-cols-2">
          <TabsTrigger value="email" className="gap-1.5 text-[11px]"><Mail className="h-3 w-3" /> E-mail</TabsTrigger>
          <TabsTrigger value="sms" className="gap-1.5 text-[11px]"><MessageSquare className="h-3 w-3" /> SMS</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-3 space-y-3">
        {/* Tri-state toggle */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { v: "inherit" as const, label: "Arv standard" },
            { v: "on" as const, label: "Tving til" },
            { v: "off" as const, label: "Slå fra" },
          ].map((opt) => {
            const current =
              row?.enabled === true ? "on"
              : row?.enabled === false ? "off"
              : "inherit";
            const active = current === opt.v;
            return (
              <button
                key={opt.v}
                type="button"
                onClick={async () => {
                  if (opt.v === "inherit") {
                    if (!row) return;
                    // Hvis kun enabled er overridden → ryd helt; ellers nulstil til null
                    if (!row.subject && !row.body && row.lead_time_minutes == null) {
                      await onClear(event.key, channel);
                    } else {
                      await onPatch(event.key, channel, { enabled: null });
                    }
                  } else {
                    await onPatch(event.key, channel, { enabled: opt.v === "on" });
                  }
                }}
                className={cn(
                  "rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground hover:border-foreground/50",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-[10.5px] text-muted-foreground">
          Lige nu: <span className="font-medium text-foreground">
            {effectiveEnabled ? "Sendes" : "Sendes ikke"}
          </span>
          {status === "inherit" && def && (
            <> · Arvet fra {scope === "agreement" ? "kunde/virksomhed" : "virksomheden"}</>
          )}
        </p>

        {!toggleOnly && (
          <TemplateOverride
            channel={channel}
            row={row}
            def={def}
            onPatch={(p) => onPatch(event.key, channel, p)}
            onClear={() => onClear(event.key, channel)}
          />
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, scope }: { status: "inherit" | "custom" | "off"; scope: Scope }) {
  const map = {
    inherit: { label: "Arver", cls: "bg-muted text-muted-foreground border-border" },
    custom: { label: scope === "agreement" ? "Tilpasset for aftalen" : "Tilpasset for kunden", cls: "bg-accent/10 text-accent border-accent/30" },
    off: { label: "Slået fra", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  } as const;
  const m = map[status];
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[10.5px] font-medium", m.cls)}>
      {m.label}
    </span>
  );
}

function TemplateOverride({
  channel, row, def, onPatch, onClear,
}: {
  channel: Channel;
  row: Row | null;
  def?: { enabled: boolean; subject: string | null; body: string | null };
  onPatch: (p: Partial<Row>) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(row?.subject ?? "");
  const [body, setBody] = useState(row?.body ?? "");
  const [leadMins, setLeadMins] = useState<string>(row?.lead_time_minutes != null ? String(row.lead_time_minutes) : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSubject(row?.subject ?? "");
    setBody(row?.body ?? "");
    setLeadMins(row?.lead_time_minutes != null ? String(row.lead_time_minutes) : "");
  }, [row?.id]);

  const hasOverride = !!(row?.subject || row?.body || row?.lead_time_minutes != null);

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-foreground">
            {hasOverride ? "Tilpasset tekst aktiv" : "Bruger virksomhedens standard-tekst"}
          </p>
          <p className="text-[10.5px] text-muted-foreground truncate">
            {hasOverride
              ? (channel === "email" ? (row?.subject || def?.subject || "—") : (row?.body?.slice(0, 60) || "Tilpasset besked"))
              : (def?.subject ?? "Standard fra virksomheden")}
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setEditing(true)}>
          {hasOverride ? "Rediger" : "Tilpas"}
        </Button>
        {hasOverride && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-[11px] text-muted-foreground"
            onClick={onClear}
            title="Nulstil til standard"
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Nulstil
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
      {channel === "email" && (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Emne</p>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={def?.subject ?? "Emne…"}
            className="h-8 text-[12px]"
          />
        </div>
      )}
      <div>
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Besked</p>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={def?.body ?? "Tekst…"}
          rows={4}
          className="text-[12px] bg-background resize-none"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          Brug fx <code>{"{{kundens_navn}}"}</code>, <code>{"{{service}}"}</code>, <code>{"{{tidspunkt}}"}</code>.
        </p>
      </div>
      <div>
        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Minutter før besøg (kun "påmindelse")
        </p>
        <Input
          type="number"
          min={0}
          max={20160}
          value={leadMins}
          onChange={(e) => setLeadMins(e.target.value)}
          placeholder="Tomt = arv"
          className="h-8 text-[12px] w-32"
        />
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setEditing(false)} disabled={saving}>
          Annullér
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-7 text-[11px]"
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
              toast.success("Tilpasning gemt");
              setEditing(false);
            } catch (e: any) {
              toast.error(e?.message ?? "Kunne ikke gemme");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
          Gem
        </Button>
      </div>
    </div>
  );
}