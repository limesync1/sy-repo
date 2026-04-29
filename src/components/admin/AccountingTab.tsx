import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, RefreshCw, Check, AlertCircle } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/admin/shared/AdminUI";

type Provider = "economic" | "billy" | "dinero";

const PROVIDERS: { value: Provider; label: string; description: string; fields: { key: string; label: string; help?: string; type?: string }[] }[] = [
  {
    value: "economic", label: "E-conomic",
    description: "Send ordrer som salgsordrer i e-conomic. Kræver app-secret-token og agreement-grant-token.",
    fields: [
      { key: "api_secret", label: "App Secret Token", help: "Hentes hos e-conomic developer", type: "password" },
      { key: "api_token",  label: "Agreement Grant Token", help: "Genereres når du installerer app'en på din aftale", type: "password" },
    ],
  },
  {
    value: "billy", label: "Billy",
    description: "Synkroniser kunder, varer og fakturakladder med Billy.",
    fields: [
      { key: "api_token", label: "API Access Token", help: "Findes under Indstillinger → API i Billy", type: "password" },
    ],
  },
  {
    value: "dinero", label: "Dinero",
    description: "Synkroniser kunder, varer og fakturakladder med Dinero.",
    fields: [
      { key: "api_token", label: "Client ID", type: "text" },
      { key: "api_secret", label: "Client Secret", type: "password" },
      { key: "organization_id", label: "Organisations-ID", help: "Findes i URL'en når du er logget ind i Dinero", type: "text" },
    ],
  },
];

interface Integration {
  id?: string;
  business_id: string;
  provider: Provider;
  is_active: boolean;
  api_token: string | null;
  api_secret: string | null;
  agreement_number: string | null;
  organization_id: string | null;
  last_pull_at: string | null;
  last_push_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  settings: {
    push_pending?: boolean;
    default_payment_terms_days?: number;
    default_vat_rate?: number;
    auto_create_products?: boolean;
    send_order_as?: "order" | "invoice_draft" | "quote";
  };
}

export default function AccountingTab({ businessId }: { businessId: string; businessName: string }) {
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [provider, setProvider] = useState<Provider>("economic");
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<Integration["settings"]>({
    push_pending: true, default_payment_terms_days: 14, default_vat_rate: 25,
    auto_create_products: true, send_order_as: "order",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [queueCount, setQueueCount] = useState(0);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("accounting_integrations" as any).select("*").eq("business_id", businessId).maybeSingle();
    if (data) {
      const d = data as any as Integration;
      setIntegration(d);
      setProvider(d.provider);
      setCreds({
        api_token: d.api_token ?? "", api_secret: d.api_secret ?? "",
        agreement_number: d.agreement_number ?? "", organization_id: d.organization_id ?? "",
      });
      setSettings({ ...settings, ...(d.settings ?? {}) });
    }
    const { data: log } = await supabase.from("accounting_sync_log" as any).select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(15);
    setLogs((log as any) ?? []);
    const { count } = await supabase.from("accounting_sync_queue" as any).select("*", { count: "exact", head: true }).eq("business_id", businessId).in("status", ["pending", "failed"]);
    setQueueCount(count ?? 0);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [businessId]);

  const currentProvider = PROVIDERS.find(p => p.value === provider)!;

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("accounting-test-connection", {
        body: { business_id: businessId, provider, ...creds, settings },
      });
      if (error) throw error;
      if ((data as any)?.ok) toast.success("Forbindelse OK!");
      else toast.error((data as any)?.message ?? "Forbindelse fejlede");
    } catch (e: any) {
      toast.error(e.message ?? "Kunne ikke teste forbindelse");
    } finally { setTesting(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        business_id: businessId, provider, is_active: true,
        api_token: creds.api_token || null, api_secret: creds.api_secret || null,
        agreement_number: creds.agreement_number || null,
        organization_id: creds.organization_id || null,
        settings: settings as any,
      };
      const { error } = await supabase.from("accounting_integrations" as any).upsert(payload, { onConflict: "business_id" });
      if (error) throw error;
      toast.success("Integration gemt");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Kunne ikke gemme");
    } finally { setSaving(false); }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const r1 = await supabase.functions.invoke("accounting-sync", { body: { business_id: businessId, mode: "queue" } });
      const r2 = await supabase.functions.invoke("accounting-sync", { body: { business_id: businessId, mode: "pull" } });
      if (r1.error || r2.error) throw r1.error ?? r2.error;
      toast.success("Synkronisering færdig");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Synk fejlede");
    } finally { setSyncing(false); }
  };

  const handleDisable = async () => {
    if (!integration) return;
    if (!confirm("Vil du deaktivere integrationen? Data slettes ikke.")) return;
    await supabase.from("accounting_integrations" as any).update({ is_active: false }).eq("business_id", businessId);
    toast.success("Integration deaktiveret");
    await load();
  };

  if (loading) return <div className="py-10 text-center text-sm text-muted-foreground">Indlæser…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regnskab"
        description="Forbind dit regnskabsprogram. Kunder, services og aftaler synkroniseres automatisk."
      />

      {/* Status */}
      {integration?.is_active && (
        <SectionCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="capitalize">{integration.provider}</Badge>
              {integration.last_error
                ? <span className="flex items-center gap-1 text-sm text-destructive"><AlertCircle className="h-4 w-4" />Sidste fejl: {integration.last_error}</span>
                : <span className="flex items-center gap-1 text-sm text-muted-foreground"><Check className="h-4 w-4 text-emerald-600" />Aktiv</span>}
              {queueCount > 0 && <Badge variant="outline">{queueCount} i kø</Badge>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSyncNow} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Synk nu</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDisable}>Deaktiver</Button>
            </div>
          </div>
          {(integration.last_pull_at || integration.last_push_at) && (
            <div className="mt-3 text-xs text-muted-foreground">
              {integration.last_push_at && <span>Sidste push: {new Date(integration.last_push_at).toLocaleString("da-DK")} · </span>}
              {integration.last_pull_at && <span>Sidste pull: {new Date(integration.last_pull_at).toLocaleString("da-DK")}</span>}
            </div>
          )}
        </SectionCard>
      )}

      {/* Provider valg */}
      <Card>
        <CardHeader><CardTitle className="text-base">Regnskabsprogram</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {PROVIDERS.map(p => (
              <button key={p.value} type="button" onClick={() => setProvider(p.value)}
                className={`rounded-xl border p-4 text-left transition ${provider === p.value ? "border-foreground bg-secondary" : "border-border hover:bg-secondary/50"}`}>
                <div className="font-semibold">{p.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{p.description}</div>
              </button>
            ))}
          </div>

          <div className="space-y-3 pt-2">
            {currentProvider.fields.map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Input type={f.type ?? "text"} value={creds[f.key] ?? ""}
                  onChange={e => setCreds({ ...creds, [f.key]: e.target.value })}
                  placeholder={f.help} autoComplete="off" />
                {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Indstillinger */}
      <Card>
        <CardHeader><CardTitle className="text-base">Synk-indstillinger</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Send afventende aftaler</div>
              <p className="text-xs text-muted-foreground">Hvis fra: kun bekræftede/færdige aftaler sendes til regnskabsprogrammet.</p>
            </div>
            <Switch checked={settings.push_pending !== false} onCheckedChange={v => setSettings({ ...settings, push_pending: v })} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Auto-opret varer</div>
              <p className="text-xs text-muted-foreground">Opret automatisk vare-nr i regnskabsprogrammet for hver service.</p>
            </div>
            <Switch checked={settings.auto_create_products !== false} onCheckedChange={v => setSettings({ ...settings, auto_create_products: v })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Standard betalingsfrist (dage)</Label>
              <Input type="number" value={settings.default_payment_terms_days ?? 14}
                onChange={e => setSettings({ ...settings, default_payment_terms_days: Number(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1.5">
              <Label>Standard moms-sats (%)</Label>
              <Input type="number" value={settings.default_vat_rate ?? 25}
                onChange={e => setSettings({ ...settings, default_vat_rate: Number(e.target.value) || 0 })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleTest} disabled={testing}>
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          <span className="ml-2">Test forbindelse</span>
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Gem og aktiver
        </Button>
      </div>

      {/* Sync log */}
      {logs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Seneste synkronisering</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5 text-sm">
              {logs.map(l => (
                <div key={l.id} className="flex items-start gap-2 border-b border-border/50 py-1.5 last:border-0">
                  <Badge variant={l.status === "success" ? "secondary" : l.status === "error" ? "destructive" : "outline"} className="shrink-0 capitalize">{l.status}</Badge>
                  <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString("da-DK")}</span>
                  <span className="capitalize">{l.direction} {l.entity_type}</span>
                  {l.message && <span className="text-muted-foreground truncate">— {l.message}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}