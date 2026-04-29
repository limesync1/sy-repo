import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, Check, AlertCircle, ExternalLink, Eye, EyeOff,
  ArrowLeft, ArrowRight, Plug, Settings2, ListChecks, ShieldCheck,
} from "lucide-react";
import { PageHeader, SectionCard } from "@/components/admin/shared/AdminUI";
import economicLogo from "@/assets/accounting/economic.png";
import billyLogo from "@/assets/accounting/billy.png";
import dineroLogo from "@/assets/accounting/dinero.png";

type Provider = "economic" | "billy" | "dinero";

interface ProviderField {
  key: string;
  label: string;
  help?: string;
  type?: "text" | "password";
  placeholder?: string;
}

interface ProviderDef {
  value: Provider;
  label: string;
  logo: string;
  tagline: string;
  description: string;
  helpUrl: string;
  helpUrlLabel: string;
  fields: ProviderField[];
  setupSteps: string[];
}

const PROVIDERS: ProviderDef[] = [
  {
    value: "economic",
    label: "e-conomic",
    logo: economicLogo,
    tagline: "Markedsledende i Danmark",
    description: "Send aftaler som salgsordrer direkte i e-conomic. Synkroniser kunder og varer.",
    helpUrl: "https://www.e-conomic.dk/regnskabsprogram/api",
    helpUrlLabel: "Sådan finder du dine tokens",
    fields: [
      { key: "api_secret", label: "App Secret Token", type: "password",
        help: "Bruges til at identificere appen.", placeholder: "demo-secret-token" },
      { key: "api_token", label: "Agreement Grant Token", type: "password",
        help: "Bruges til at give adgang til netop din aftale.", placeholder: "demo-agreement-token" },
    ],
    setupSteps: [
      "Log ind i e-conomic og åbn App Marketplace.",
      "Find vores Serviceydere-app og installér den på din aftale.",
      "Når den er installeret, vises både App Secret Token og Agreement Grant Token.",
      "Kopiér dem ind herunder og tryk Test forbindelse.",
    ],
  },
  {
    value: "billy",
    label: "Billy",
    logo: billyLogo,
    tagline: "Enkelt og hurtigt",
    description: "Synkroniser kunder, varer og fakturakladder med Billy.",
    helpUrl: "https://www.billy.dk/support/article/api-access-token/",
    helpUrlLabel: "Find dit Access Token",
    fields: [
      { key: "api_token", label: "API Access Token", type: "password",
        help: "Hentes under Indstillinger → API i din Billy-konto.", placeholder: "abc123…" },
    ],
    setupSteps: [
      "Log ind i Billy.",
      "Gå til Indstillinger → API.",
      "Tryk 'Generér nyt access token'.",
      "Kopiér tokenet ind herunder og tryk Test forbindelse.",
    ],
  },
  {
    value: "dinero",
    label: "Dinero",
    logo: dineroLogo,
    tagline: "Smart for små virksomheder",
    description: "Synkroniser kunder, varer og fakturakladder med Dinero.",
    helpUrl: "https://api.dinero.dk/docs/",
    helpUrlLabel: "Dineros API-dokumentation",
    fields: [
      { key: "api_token", label: "Client ID", type: "text",
        help: "Oprettes via Dineros developer-portal.", placeholder: "din-client-id" },
      { key: "api_secret", label: "Client Secret", type: "password",
        help: "Den tilhørende secret.", placeholder: "din-client-secret" },
      { key: "organization_id", label: "Organisations-ID", type: "text",
        help: "Findes i URL'en når du er logget ind, fx /198765/.", placeholder: "198765" },
    ],
    setupSteps: [
      "Log ind på Dinero og find dit organisations-ID i URL'en.",
      "Opret en API-integration i Dineros developer-portal.",
      "Kopiér Client ID og Client Secret ind herunder.",
      "Tryk Test forbindelse.",
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

type Mode = "overview" | "wizard";

export default function AccountingTab({ businessId }: { businessId: string; businessName: string }) {
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [mode, setMode] = useState<Mode>("overview");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [provider, setProvider] = useState<Provider>("economic");
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const defaultSettings = {
    push_pending: true,
    default_payment_terms_days: 14,
    default_vat_rate: 25,
    auto_create_products: true,
    send_order_as: "order" as const,
  };
  const [settings, setSettings] = useState<Integration["settings"]>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [queueCount, setQueueCount] = useState(0);

  const currentProvider = useMemo(
    () => PROVIDERS.find(p => p.value === provider)!,
    [provider],
  );

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("accounting_integrations" as any)
      .select("*").eq("business_id", businessId).maybeSingle();
    if (data) {
      const d = data as any as Integration;
      setIntegration(d);
      setProvider(d.provider);
      setCreds({
        api_token: d.api_token ?? "", api_secret: d.api_secret ?? "",
        agreement_number: d.agreement_number ?? "", organization_id: d.organization_id ?? "",
      });
      setSettings({ ...defaultSettings, ...(d.settings ?? {}) });
      setMode("overview");
    } else {
      setIntegration(null);
      setMode("overview");
    }
    const { data: log } = await supabase.from("accounting_sync_log" as any)
      .select("*").eq("business_id", businessId)
      .order("created_at", { ascending: false }).limit(15);
    setLogs((log as any) ?? []);
    const { count } = await supabase.from("accounting_sync_queue" as any)
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId).in("status", ["pending", "failed"]);
    setQueueCount(count ?? 0);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [businessId]);

  const startWizard = (preselect?: Provider) => {
    if (preselect) setProvider(preselect);
    setStep(1);
    setTestResult(null);
    setMode("wizard");
  };

  const credsValid = currentProvider.fields.every(f => (creds[f.key] ?? "").trim().length > 0);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("accounting-test-connection", {
        body: { business_id: businessId, provider, ...creds, settings },
      });
      if (error) throw error;
      const r = data as { ok: boolean; message?: string };
      setTestResult(r);
      if (r.ok) toast.success("Forbindelsen virker!");
      else toast.error(r.message ?? "Forbindelsen fejlede");
    } catch (e: any) {
      const msg = e?.message ?? "Kunne ikke teste forbindelse";
      setTestResult({ ok: false, message: msg });
      toast.error(msg);
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
        last_error: null, last_error_at: null,
      };
      const { error } = await supabase.from("accounting_integrations" as any)
        .upsert(payload, { onConflict: "business_id" });
      if (error) throw error;
      toast.success(`${currentProvider.label} er nu integreret`);
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
    if (!confirm("Vil du afbryde integrationen? Allerede synkroniserede data slettes ikke.")) return;
    await supabase.from("accounting_integrations" as any)
      .delete().eq("business_id", businessId);
    toast.success("Integration afbrudt");
    setIntegration(null);
    setCreds({});
    setSettings(defaultSettings);
    await load();
  };

  const handleSwitchProvider = () => {
    if (!confirm("Du kan kun have ét regnskabsprogram aktivt. Vil du erstatte det nuværende?")) return;
    setCreds({});
    setTestResult(null);
    startWizard();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Indlæser…
      </div>
    );
  }

  // ===== OVERVIEW (no integration) =====
  if (mode === "overview" && !integration?.is_active) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Regnskab"
          description="Forbind ét regnskabsprogram. Kunder, services og aftaler synkroniseres automatisk begge veje."
        />

        <SectionCard>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-secondary p-2"><Plug className="h-5 w-5" /></div>
            <div className="flex-1">
              <div className="font-semibold">Vælg dit regnskabsprogram</div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Du kan have ét program integreret ad gangen. Du kan altid skifte senere.
              </p>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDERS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => startWizard(p.value)}
              className="group flex flex-col rounded-2xl border border-border bg-card p-5 text-left transition hover:border-foreground hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-center justify-center rounded-xl bg-secondary/40 p-4">
                <img src={p.logo} alt={p.label} className="h-10 w-auto" />
              </div>
              <div className="mt-4 font-semibold">{p.label}</div>
              <div className="text-xs text-muted-foreground">{p.tagline}</div>
              <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-foreground opacity-0 transition group-hover:opacity-100">
                Forbind <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ===== OVERVIEW (active integration) =====
  if (mode === "overview" && integration?.is_active) {
    const activeDef = PROVIDERS.find(p => p.value === integration.provider)!;
    return (
      <div className="space-y-6">
        <PageHeader
          title="Regnskab"
          description="Dit regnskabsprogram er forbundet og synkroniserer automatisk."
        />

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-24 items-center justify-center rounded-xl bg-secondary/40">
                <img src={activeDef.logo} alt={activeDef.label} className="h-9 w-auto" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{activeDef.label}</div>
                  {integration.last_error ? (
                    <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Fejl</Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                      <Check className="h-3 w-3" />Aktiv
                    </Badge>
                  )}
                  {queueCount > 0 && <Badge variant="outline">{queueCount} i kø</Badge>}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {integration.last_push_at && <>Sidste push: {new Date(integration.last_push_at).toLocaleString("da-DK")}</>}
                  {integration.last_push_at && integration.last_pull_at && " · "}
                  {integration.last_pull_at && <>Sidste pull: {new Date(integration.last_pull_at).toLocaleString("da-DK")}</>}
                  {!integration.last_push_at && !integration.last_pull_at && "Endnu ikke synkroniseret"}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleSyncNow} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="ml-2">Synk nu</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSwitchProvider}>Skift program</Button>
              <Button variant="ghost" size="sm" onClick={handleDisable}>Afbryd</Button>
            </div>
          </div>
          {integration.last_error && (
            <div className="border-t border-destructive/20 bg-destructive/5 px-5 py-3 text-sm text-destructive">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-medium">Sidste fejl</div>
                  <div className="text-destructive/90">{integration.last_error}</div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader><CardTitle className="text-base">Synk-indstillinger</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">Send afventende aftaler</div>
                <p className="text-xs text-muted-foreground">Hvis fra: kun bekræftede/færdige aftaler sendes.</p>
              </div>
              <Switch checked={settings.push_pending !== false}
                onCheckedChange={v => setSettings({ ...settings, push_pending: v })} />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">Auto-opret varer</div>
                <p className="text-xs text-muted-foreground">Opret automatisk vare-nr i regnskabsprogrammet for hver service.</p>
              </div>
              <Switch checked={settings.auto_create_products !== false}
                onCheckedChange={v => setSettings({ ...settings, auto_create_products: v })} />
            </div>
            <Separator />
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
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Gem indstillinger
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs */}
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
                    {l.message && <span className="truncate text-muted-foreground">— {l.message}</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ===== WIZARD =====
  return (
    <div className="space-y-6">
      <PageHeader
        title={integration?.is_active ? "Skift regnskabsprogram" : "Forbind regnskabsprogram"}
        description="Vi guider dig igennem i 3 enkle trin."
      />

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, label: "Vælg program", icon: Plug },
          { n: 2, label: "Test forbindelse", icon: ShieldCheck },
          { n: 3, label: "Indstillinger", icon: Settings2 },
        ].map((s, idx) => {
          const active = step === s.n;
          const done = step > s.n;
          const Icon = s.icon;
          return (
            <div key={s.n} className="flex flex-1 items-center gap-2">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                done ? "bg-foreground text-background border-foreground"
                : active ? "border-foreground" : "border-border text-muted-foreground"
              }`}>
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className={`text-sm ${active ? "font-medium" : "text-muted-foreground"} hidden sm:block`}>{s.label}</div>
              {idx < 2 && <div className={`mx-2 h-px flex-1 ${done ? "bg-foreground" : "bg-border"}`} />}
            </div>
          );
        })}
      </div>

      {/* Step 1: choose */}
      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDERS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => { setProvider(p.value); setCreds({}); setTestResult(null); }}
              className={`flex flex-col rounded-2xl border p-5 text-left transition ${
                provider === p.value
                  ? "border-foreground bg-secondary/40 ring-2 ring-foreground/10"
                  : "border-border hover:border-foreground/50 hover:bg-secondary/20"
              }`}
            >
              <div className="flex items-center justify-center rounded-xl bg-background p-4">
                <img src={p.logo} alt={p.label} className="h-10 w-auto" />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="font-semibold">{p.label}</div>
                {provider === p.value && <Check className="h-4 w-4" />}
              </div>
              <div className="text-xs text-muted-foreground">{p.tagline}</div>
              <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: connect + test */}
      {step === 2 && (
        <div className="grid gap-6 lg:grid-cols-[1fr,1.4fr]">
          {/* Setup guide */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <img src={currentProvider.logo} alt={currentProvider.label} className="h-8 w-auto" />
                <div>
                  <CardTitle className="text-base">Sådan kommer du i gang</CardTitle>
                  <p className="text-xs text-muted-foreground">Følg trinene for {currentProvider.label}.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="space-y-3 text-sm">
                {currentProvider.setupSteps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">{i + 1}</span>
                    <span className="text-muted-foreground">{s}</span>
                  </li>
                ))}
              </ol>
              <a href={currentProvider.helpUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline">
                {currentProvider.helpUrlLabel} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </CardContent>
          </Card>

          {/* Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">API-oplysninger</CardTitle>
              <p className="text-xs text-muted-foreground">Dine nøgler gemmes krypteret og bruges kun til synk.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentProvider.fields.map(f => {
                const isPwd = f.type === "password";
                const reveal = !!showSecret[f.key];
                return (
                  <div key={f.key} className="space-y-1.5">
                    <Label>{f.label}</Label>
                    <div className="relative">
                      <Input
                        type={isPwd && !reveal ? "password" : "text"}
                        value={creds[f.key] ?? ""}
                        onChange={e => { setCreds({ ...creds, [f.key]: e.target.value }); setTestResult(null); }}
                        placeholder={f.placeholder}
                        autoComplete="off"
                        className={isPwd ? "pr-10" : undefined}
                      />
                      {isPwd && (
                        <button type="button"
                          onClick={() => setShowSecret(s => ({ ...s, [f.key]: !s[f.key] }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          aria-label={reveal ? "Skjul" : "Vis"}>
                          {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                    {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
                  </div>
                );
              })}

              {/* Test result */}
              {testResult && (
                <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                  testResult.ok
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}>
                  {testResult.ok ? <Check className="mt-0.5 h-4 w-4" /> : <AlertCircle className="mt-0.5 h-4 w-4" />}
                  <div>
                    <div className="font-medium">{testResult.ok ? "Forbindelsen virker" : "Forbindelsen fejlede"}</div>
                    {testResult.message && <div className="opacity-90">{testResult.message}</div>}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={handleTest} disabled={testing || !credsValid}>
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  <span className="ml-2">Test forbindelse</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: settings */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Synk-indstillinger</CardTitle>
            <p className="text-xs text-muted-foreground">Du kan altid ændre disse senere.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">Send afventende aftaler</div>
                <p className="text-xs text-muted-foreground">Hvis fra: kun bekræftede/færdige aftaler sendes.</p>
              </div>
              <Switch checked={settings.push_pending !== false}
                onCheckedChange={v => setSettings({ ...settings, push_pending: v })} />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">Auto-opret varer</div>
                <p className="text-xs text-muted-foreground">Opret automatisk vare-nr for hver service.</p>
              </div>
              <Switch checked={settings.auto_create_products !== false}
                onCheckedChange={v => setSettings({ ...settings, auto_create_products: v })} />
            </div>
            <Separator />
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
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <Button variant="ghost" onClick={() => {
          if (step === 1) setMode("overview");
          else setStep((step - 1) as 1 | 2 | 3);
        }}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {step === 1 ? "Annullér" : "Tilbage"}
        </Button>

        {step < 3 ? (
          <Button
            onClick={() => setStep((step + 1) as 1 | 2 | 3)}
            disabled={(step === 2 && (!testResult?.ok))}
            title={step === 2 && !testResult?.ok ? "Test forbindelsen først" : undefined}
          >
            {step === 2 && !testResult?.ok ? "Test forbindelsen først" : "Næste"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />}
            Aktiver integration
          </Button>
        )}
      </div>
    </div>
  );
}