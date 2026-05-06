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

export function CustomerNotificationsSettings({ businessId, upcomingHoursBefore, onUpcomingHoursChange }: Props) {
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
  const [saving, setSaving] = useState<EventKey | null>(null);

  useEffect(() => {
    if (!rows) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const e of EVENTS) {
        const existing = rows.find((r: any) => r.event_type === e.key);
        if (existing) {
          next[e.key] = { subject: existing.subject, body: existing.body, enabled: existing.enabled };
        }
      }
      return next;
    });
  }, [rows]);

  const save = async (key: EventKey) => {
    setSaving(key);
    const d = drafts[key];
    const { error } = await supabase
      .from("customer_notification_templates")
      .upsert({
        business_id: businessId,
        event_type: key,
        subject: d.subject,
        body: d.body,
        enabled: d.enabled,
      }, { onConflict: "business_id,event_type" });
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Skabelon gemt");
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
            <Button size="sm" onClick={() => save(e.key)} disabled={saving === e.key}>
              {saving === e.key ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              Gem skabelon
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
