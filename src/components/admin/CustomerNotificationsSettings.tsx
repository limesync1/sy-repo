import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  businessId: string;
  upcomingHoursBefore: number;
  onUpcomingHoursChange: (hrs: number) => void;
  smsEnabled: boolean;
  smsSenderId: string;
  onSmsEnabledChange: (v: boolean) => void;
  onSmsSenderIdChange: (v: string) => void;
}

type EventKey = "service_upcoming" | "service_completed";

const EVENTS: { key: EventKey; label: string; help: string; defaults: { subject: string; body: string } }[] = [
  {
    key: "service_upcoming",
    label: "Vi kommer og udfører aftalen",
    help: "Sendes automatisk et stykke tid før det planlagte besøg (du bestemmer hvor mange timer før).",
    defaults: {
      subject: "Vi kommer og udfører {{service_name}}",
      body: "Hej {{customer_name}},\n\nVi kommer forbi {{planned_arrival}} og udfører {{service_name}}.\n\nVi glæder os til at se dig.\n\nVenlig hilsen,\n{{business_name}}",
    },
  },
  {
    key: "service_completed",
    label: "Vi har udført aftalen",
    help: "Sendes automatisk når medarbejderen markerer opgaven som udført.",
    defaults: {
      subject: "Vi har udført {{service_name}}",
      body: "Hej {{customer_name}},\n\nVi har i dag været forbi og udført {{service_name}}.\nDu modtager snarest faktura via vores regnskabssystem.\n\nTak fordi du valgte os.\n\nVenlig hilsen,\n{{business_name}}",
    },
  },
];

const PLACEHOLDERS = ["customer_name", "business_name", "service_name", "planned_arrival"];

const SMS_DEFAULTS: Record<EventKey, string> = {
  service_upcoming: "Hej {{customer_name}}, vi kommer {{planned_arrival}} og udfører {{service_name}}. Mvh {{business_name}}",
  service_completed: "Hej {{customer_name}}, vi har udført {{service_name}} i dag. Faktura sendes snarest. Mvh {{business_name}}",
};

export function CustomerNotificationsSettings({
  businessId, upcomingHoursBefore, onUpcomingHoursChange,
  smsEnabled, smsSenderId, onSmsEnabledChange, onSmsSenderIdChange,
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
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!rows) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const e of EVENTS) {
        const existing = rows.find((r: any) => r.event_type === e.key && (r.channel ?? "email") === "email");
        if (existing) {
          next[e.key] = { subject: existing.subject, body: existing.body, enabled: existing.enabled };
        }
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
        business_id: businessId,
        event_type: key,
        channel: "email",
        subject: d.subject,
        body: d.body,
        enabled: d.enabled,
      }, { onConflict: "business_id,event_type,channel" });
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Skabelon gemt");
    qc.invalidateQueries({ queryKey: ["customer-notif-templates", businessId] });
  };

  const saveSms = async (key: EventKey) => {
    setSaving(`sms-${key}`);
    const d = smsDrafts[key];
    const { error } = await supabase
      .from("customer_notification_templates")
      .upsert({
        business_id: businessId,
        event_type: key,
        channel: "sms",
        subject: null,
        body: d.body,
        enabled: d.enabled,
      }, { onConflict: "business_id,event_type,channel" });
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success("SMS-skabelon gemt");
    qc.invalidateQueries({ queryKey: ["customer-notif-templates", businessId] });
  };

  if (isLoading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4">
        <Label className="text-sm font-medium">Hvor lang tid før besøget skal kunden have besked?</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">Bruges til “Vi kommer og udfører aftalen”-mailen.</p>
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="number" min={1} max={168} className="w-28"
            value={upcomingHoursBefore}
            onChange={(e) => onUpcomingHoursChange(Math.max(1, Math.min(168, Number(e.target.value) || 24)))}
          />
          <span className="text-sm text-muted-foreground">timer før</span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label className="text-sm font-medium">SMS til kunder</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Send SMS-påmindelser via et alfanumerisk afsendernavn (fx jeres firmanavn). Maks 11 tegn — kun bogstaver,
              tal og mellemrum. Kunden kan ikke svare tilbage på SMS'er med afsendernavn.
            </p>
          </div>
          <Switch checked={smsEnabled} onCheckedChange={onSmsEnabledChange} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Afsendernavn (vises hos kunden)</Label>
          <Input
            value={smsSenderId}
            maxLength={11}
            placeholder="Fx Rens-A/S"
            onChange={(e) => onSmsSenderIdChange(e.target.value.replace(/[^A-Za-z0-9 ]/g, "").slice(0, 11))}
            disabled={!smsEnabled}
          />
          <p className="text-xs text-muted-foreground">{smsSenderId.length}/11 tegn</p>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Tilgængelige pladsholdere</p>
        <p className="mt-1">{PLACEHOLDERS.map((p) => `{{${p}}}`).join("  ·  ")}</p>
      </div>

      {EVENTS.map((e) => (
        <div key={e.key} className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{e.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{e.help}</p>
            </div>
            <Switch
              checked={drafts[e.key].enabled}
              onCheckedChange={(v) => setDrafts((p) => ({ ...p, [e.key]: { ...p[e.key], enabled: v } }))}
            />
          </div>
          <p className="text-xs font-medium text-foreground">E-mail</p>
          <div className="space-y-2">
            <Label className="text-xs">Emne</Label>
            <Input
              value={drafts[e.key].subject}
              onChange={(ev) => setDrafts((p) => ({ ...p, [e.key]: { ...p[e.key], subject: ev.target.value } }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Brødtekst</Label>
            <Textarea
              rows={7}
              value={drafts[e.key].body}
              onChange={(ev) => setDrafts((p) => ({ ...p, [e.key]: { ...p[e.key], body: ev.target.value } }))}
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => save(e.key)} disabled={saving === `email-${e.key}`}>
              {saving === `email-${e.key}` ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              Gem e-mail
            </Button>
          </div>

          <div className="border-t border-border pt-3 mt-2 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-medium text-foreground">SMS {smsEnabled ? "" : <span className="text-muted-foreground font-normal">(slå SMS til ovenfor for at aktivere)</span>}</p>
              <Switch
                checked={smsDrafts[e.key].enabled}
                disabled={!smsEnabled}
                onCheckedChange={(v) => setSmsDrafts((p) => ({ ...p, [e.key]: { ...p[e.key], enabled: v } }))}
              />
            </div>
            <Textarea
              rows={3}
              value={smsDrafts[e.key].body}
              disabled={!smsEnabled}
              maxLength={459}
              onChange={(ev) => setSmsDrafts((p) => ({ ...p, [e.key]: { ...p[e.key], body: ev.target.value } }))}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{smsDrafts[e.key].body.length} tegn (1 SMS = op til 160)</p>
              <Button size="sm" variant="outline" disabled={!smsEnabled || saving === `sms-${e.key}`} onClick={() => saveSms(e.key)}>
                {saving === `sms-${e.key}` ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                Gem SMS
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
