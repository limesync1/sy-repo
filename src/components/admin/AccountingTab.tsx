import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, Check, AlertCircle, ExternalLink, Eye, EyeOff,
  ArrowLeft, ArrowRight, Plug, Settings2, ShieldCheck, Calculator,
  Clock, ListChecks, Sparkles, X, Upload, Download, RotateCw, AlertTriangle,
  Copy,
} from "lucide-react";
import {
  PageHeader, PrimaryButton, SectionCard, StatCard, EmptyState, FieldLabel,
} from "@/components/admin/shared/AdminUI";
import economicLogo from "@/assets/accounting/economic.png";
import billyLogo from "@/assets/accounting/billy.png";
import dineroLogo from "@/assets/accounting/dinero.png";

/**
 * AccountingTab — virksomhedens regnskabs-integration.
 *
 *  • Når intet er forbundet: viser EmptyState + udbyder-kort til at starte
 *    integrationsguiden.
 *  • Når noget er forbundet: viser StatCards (status, kø, sidste synk),
 *    SectionCard med synk-indstillinger, og en log-sektion. Følger samme
 *    visuelle sprog som de andre admin-faner (Kunder, Medarbejdere, Leads).
 *  • Integrationsguiden er en fuldskærms 3-trins wizard med tydelig progress
 *    og venlige fejlmeddelelser fra adapter-laget.
 */

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
  note?: { tone: "info" | "warning"; title: string; body: string };
}

const PROVIDERS: ProviderDef[] = [
  {
    value: "economic",
    label: "e-conomic",
    logo: economicLogo,
    tagline: "Markedsledende i Danmark",
    description: "Send aftaler som salgsordrer direkte i e-conomic. Kunder og varer holdes synkroniseret begge veje.",
    helpUrl: "https://www.e-conomic.com/developer",
    helpUrlLabel: "Åbn e-conomic Developer Portal",
    fields: [
      { key: "api_secret", label: "App Secret Token", type: "password",
        help: "Den 'App Secret Token' du får når du opretter din egen app i Developer Portal.", placeholder: "fx demo-XXXXXXXXXXXXXXXX" },
      { key: "api_token", label: "Agreement Grant Token", type: "password",
        help: "Genereres når du installerer din egen app på din e-conomic-aftale.", placeholder: "fx demo-XXXXXXXXXXXXXXXX" },
    ],
    setupSteps: [
      "Gå til e-conomic Developer Portal (linket nedenfor) og log ind med din e-conomic-bruger.",
      "Klik 'Create new app' → giv den fx navnet 'Serviceydere' og vælg adgang til Customers, Products og Sales Orders.",
      "Når app'en er oprettet vises et 'App Secret Token' — kopiér det ind i feltet 'App Secret Token' herunder.",
      "Tryk på 'Install on agreement' øverst i app'en og vælg din e-conomic-aftale.",
      "Du får nu et 'Agreement Grant Token' — kopiér det ind i feltet 'Agreement Grant Token' herunder.",
      "Tryk 'Test forbindelse' for at bekræfte at alt virker.",
    ],
    note: {
      tone: "info",
      title: "Hvorfor opretter jeg selv en app?",
      body: "E-conomic kræver at hver integration sker via en developer-app. Ved at oprette din egen app i din egen e-conomic-aftale undgår du månedlige app-gebyrer — det er 100% gratis og tager ca. 2 minutter.",
    },
  },
  {
    value: "billy",
    label: "Billy",
    logo: billyLogo,
    tagline: "Enkelt og hurtigt",
    description: "Synkroniser kunder, varer og fakturakladder med Billy.",
    helpUrl: "https://www.billy.dk/app/#/settings/access-tokens",
    helpUrlLabel: "Åbn Billy → Access Tokens",
    fields: [
      { key: "api_token", label: "API Access Token", type: "password",
        help: "Et token genereres på din Billy-konto under Indstillinger → Access Tokens.", placeholder: "fx 8f3a9b1c2d4e…" },
    ],
    setupSteps: [
      "Log ind på Billy med din admin-bruger.",
      "Klik på dit navn nederst til venstre → 'Indstillinger'.",
      "Vælg menupunktet 'Access tokens' (eller åbn direkte via linket nedenfor).",
      "Tryk 'Opret nyt access token' → giv det navnet 'Serviceydere' og tryk 'Opret'.",
      "Kopiér det viste token (det vises kun én gang!) og indsæt det i feltet herunder.",
      "Tryk 'Test forbindelse' for at bekræfte at alt virker.",
    ],
    note: {
      tone: "info",
      title: "100% gratis og uden ekstra opsætning",
      body: "Billy giver alle kunder fri adgang til API'et. Du behøver ikke et bestemt abonnement — det virker også på Mikro/Basis-pakkerne.",
    },
  },
  {
    value: "dinero",
    label: "Dinero",
    logo: dineroLogo,
    tagline: "Kræver Dinero Pro",
    description: "Synkroniser kunder, varer og fakturakladder med Dinero.",
    helpUrl: "https://developer.dinero.dk/",
    helpUrlLabel: "Åbn Dinero Developer Portal",
    fields: [
      { key: "api_token", label: "Client ID (API-nøgle)", type: "text",
        help: "Oprettes via developer.dinero.dk når du har Dinero Pro.", placeholder: "fx 5f3a-1b2c-…" },
      { key: "api_secret", label: "Client Secret", type: "password",
        help: "Den tilhørende secret — vises kun én gang ved oprettelse.", placeholder: "fx 9c2d-…" },
      { key: "organization_id", label: "Organisations-ID", type: "text",
        help: "Det 6-cifrede tal som står i URL'en når du er logget ind på Dinero, fx app.dinero.dk/198765/…", placeholder: "fx 198765" },
    ],
    setupSteps: [
      "Tjek at din Dinero-konto er på 'Pro'-pakken (API-adgang er ikke tilgængelig på Small/Medium).",
      "Log ind på Dinero og find dit organisations-ID i adresselinjen — det 6-cifrede tal efter 'app.dinero.dk/'.",
      "Gå til developer.dinero.dk og log ind med din Dinero-bruger.",
      "Opret en ny 'API integration' og giv adgang til Contacts, Products og Vouchers.",
      "Kopiér Client ID og Client Secret ind i felterne herunder (secret vises kun én gang!).",
      "Indsæt dit organisations-ID og tryk 'Test forbindelse'.",
    ],
    note: {
      tone: "warning",
      title: "Kræver Dinero Pro-abonnement",
      body: "Dinero giver kun API-adgang til kunder på Pro-pakken. Hvis du har Small eller Medium skal du opgradere først, ellers vil forbindelsen blive afvist. Opgradér via Dinero → Indstillinger → Abonnement.",
    },
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

const formatRelativeDanish = (iso: string | null): string => {
  if (!iso) return "Aldrig";
  const ts = new Date(iso).getTime();
  const diffMs = Date.now() - ts;
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "Lige nu";
  if (min < 60) return `${min} min siden`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} t. siden`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} dage siden`;
  return new Date(iso).toLocaleDateString("da-DK");
};

// Cron-jobbet kører hver hele time (HH:00). Beregn hvornår næste kørsel er.
const nextHourlyRun = (): Date => {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
};

const formatCountdown = (d: Date): string => {
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return "Nu";
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin < 60) return `om ${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `om ${h} t.` : `om ${h} t. ${m} min`;
};

const ENTITY_LABEL: Record<string, string> = {
  customer: "Kunde",
  product: "Vare",
  order: "Aftale",
  connection: "Forbindelse",
};

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
  const [failedJobs, setFailedJobs] = useState<any[]>([]);
  const [pushedLast24h, setPushedLast24h] = useState(0);
  const [pulledLast24h, setPulledLast24h] = useState(0);
  const [lastSuccessPush, setLastSuccessPush] = useState<string | null>(null);
  const [lastSuccessPull, setLastSuccessPull] = useState<string | null>(null);
  // Re-render hvert minut så "om X min"-tæller forbliver retvisende
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNowTick(n => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);

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

    // Detaljeret fejl-liste fra køen (indeholder entity-id + præcis fejltekst)
    const { data: failed } = await supabase.from("accounting_sync_queue" as any)
      .select("*")
      .eq("business_id", businessId)
      .eq("status", "failed")
      .order("updated_at", { ascending: false })
      .limit(20);
    setFailedJobs((failed as any) ?? []);

    // Tællere for sidste 24 timer (push/pull) — viser i status-grid
    const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [{ count: pushedC }, { count: pulledC }] = await Promise.all([
      supabase.from("accounting_sync_log" as any)
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId).eq("status", "success").eq("direction", "push")
        .gte("created_at", since24),
      supabase.from("accounting_sync_log" as any)
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId).eq("status", "success").eq("direction", "pull")
        .gte("created_at", since24),
    ]);
    setPushedLast24h(pushedC ?? 0);
    setPulledLast24h(pulledC ?? 0);

    // Sidste succesrige push/pull tidspunkt — vises som "hint" på stat-cards
    const [{ data: lastPush }, { data: lastPull }] = await Promise.all([
      supabase.from("accounting_sync_log" as any)
        .select("created_at").eq("business_id", businessId)
        .eq("status", "success").eq("direction", "push")
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("accounting_sync_log" as any)
        .select("created_at").eq("business_id", businessId)
        .eq("status", "success").eq("direction", "pull")
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setLastSuccessPush((lastPush as any)?.created_at ?? null);
    setLastSuccessPull((lastPull as any)?.created_at ?? null);

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
      // Seed-kø: læg ALLE eksisterende kunder, services og aftaler i synk-køen
      // så det første push faktisk skubber data afsted (triggere fanger kun
      // fremtidige ændringer).
      await seedQueue(businessId);
      toast.success(`${currentProvider.label} er nu integreret — synkroniserer dine data…`);
      // Kør første synk i baggrunden så brugeren ser resultatet med det samme
      runFullSync(businessId).catch(() => { /* fejl vises via load() */ });
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Kunne ikke gemme");
    } finally { setSaving(false); }
  };

  const handleSaveSettingsOnly = async () => {
    if (!integration) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("accounting_integrations" as any)
        .update({ settings: settings as any })
        .eq("business_id", businessId);
      if (error) throw error;
      toast.success("Indstillinger gemt");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Kunne ikke gemme");
    } finally { setSaving(false); }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      // Hvis der intet er i køen, læg eksisterende data i køen så synk
      // faktisk har noget at sende.
      if (queueCount === 0) await seedQueue(businessId);
      const result = await runFullSync(businessId);
      const pushed = result.pushed ?? 0;
      const pulled = (result.pulledCustomers ?? 0) + (result.pulledProducts ?? 0);
      if (pushed === 0 && pulled === 0) {
        toast.success("Alt er allerede synkroniseret");
      } else {
        toast.success(`Synkronisering færdig — sendt ${pushed}, hentet ${pulled}`);
      }
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Synk fejlede");
    } finally { setSyncing(false); }
  };

  const handleDisable = async () => {
    if (!integration) return;
    await supabase.from("accounting_integrations" as any)
      .delete().eq("business_id", businessId);
    toast.success("Integration afbrudt");
    setIntegration(null);
    setCreds({});
    setSettings(defaultSettings);
    await load();
  };

  const handleSwitchProvider = () => {
    setCreds({});
    setTestResult(null);
    startWizard();
  };

  // Marker job som pending igen og kør synk med det samme. Bruges fra
  // fejl-sektionen under hver fejlende række.
  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      const { error } = await supabase.from("accounting_sync_queue" as any)
        .update({ status: "pending", scheduled_for: new Date().toISOString(), last_error: null })
        .eq("id", jobId);
      if (error) throw error;
      const r = await supabase.functions.invoke("accounting-sync", {
        body: { business_id: businessId, mode: "queue" },
      });
      if (r.error) throw r.error;
      toast.success("Forsøgt igen");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Kunne ikke prøve igen");
    } finally { setRetryingJobId(null); }
  };

  const handleRetryAllFailed = async () => {
    if (failedJobs.length === 0) return;
    setSyncing(true);
    try {
      await supabase.from("accounting_sync_queue" as any)
        .update({ status: "pending", scheduled_for: new Date().toISOString(), last_error: null })
        .eq("business_id", businessId).eq("status", "failed");
      const r = await supabase.functions.invoke("accounting-sync", {
        body: { business_id: businessId, mode: "queue" },
      });
      if (r.error) throw r.error;
      toast.success("Alle fejlende jobs forsøgt igen");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Kunne ikke prøve igen");
    } finally { setSyncing(false); }
  };

  // Læg alle eksisterende kunder/services/ordrer i køen (idempotent — duplicates
  // i samme batch giver bare lidt ekstra arbejde, ikke fejl).
  async function seedQueue(bizId: string) {
    const [{ data: bcs }, { data: pcs }, { data: svcs }, { data: ords }] = await Promise.all([
      supabase.from("business_customers").select("id").eq("business_id", bizId),
      supabase.from("private_customers").select("id").eq("business_id", bizId),
      supabase.from("services").select("id").eq("business_id", bizId),
      supabase.from("orders").select("id").eq("business_id", bizId).neq("status", "cancelled"),
    ]);
    const rows: any[] = [];
    (bcs ?? []).forEach((r: any) => rows.push({ business_id: bizId, entity_type: "customer", entity_id: r.id, operation: "update" }));
    (pcs ?? []).forEach((r: any) => rows.push({ business_id: bizId, entity_type: "customer", entity_id: r.id, operation: "update" }));
    (svcs ?? []).forEach((r: any) => rows.push({ business_id: bizId, entity_type: "product", entity_id: r.id, operation: "update" }));
    (ords ?? []).forEach((r: any) => rows.push({ business_id: bizId, entity_type: "order", entity_id: r.id, operation: "update" }));
    if (rows.length > 0) {
      // Splittes i batches af 200 for at undgå store payloads
      for (let i = 0; i < rows.length; i += 200) {
        await supabase.from("accounting_sync_queue" as any).insert(rows.slice(i, i + 200));
      }
    }
  }

  async function runFullSync(bizId: string) {
    // Kør push (queue-drain) først så pull ikke overskriver lokale ændringer
    const r1 = await supabase.functions.invoke("accounting-sync", { body: { business_id: bizId, mode: "queue" } });
    if (r1.error) throw r1.error;
    const r2 = await supabase.functions.invoke("accounting-sync", { body: { business_id: bizId, mode: "pull" } });
    if (r2.error) throw r2.error;
    return {
      pushed: (r1.data as any)?.processed ?? 0,
      pulledCustomers: (r2.data as any)?.customers ?? 0,
      pulledProducts: (r2.data as any)?.products ?? 0,
    };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Indlæser…
      </div>
    );
  }

  /* ============================================================
   * OVERVIEW — INGEN INTEGRATION
   * ============================================================ */
  if (mode === "overview" && !integration?.is_active) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Regnskab"
          description="Forbind ét regnskabsprogram. Kunder, services og aftaler synkroniseres automatisk begge veje."
        />

        <EmptyState
          icon={<Calculator />}
          title="Ingen regnskabsintegration endnu"
          description="Vælg dit regnskabsprogram nedenfor — vi guider dig igennem på under 2 minutter."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDERS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => startWizard(p.value)}
              className="group flex flex-col rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-colors duration-150 hover:border-foreground/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex h-20 items-center justify-center rounded-lg bg-secondary/40 px-4">
                <img src={p.logo} alt={p.label} className="h-10 w-auto object-contain" />
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-2">
                <div className="font-semibold text-foreground">{p.label}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{p.tagline}</div>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground transition-opacity opacity-70 group-hover:opacity-100">
                Forbind <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ============================================================
   * OVERVIEW — AKTIV INTEGRATION
   * ============================================================ */
  if (mode === "overview" && integration?.is_active) {
    const activeDef = PROVIDERS.find(p => p.value === integration.provider)!;
    const hasError = !!integration.last_error;
    const lastSync = integration.last_push_at && integration.last_pull_at
      ? (new Date(integration.last_push_at) > new Date(integration.last_pull_at) ? integration.last_push_at : integration.last_pull_at)
      : (integration.last_push_at ?? integration.last_pull_at);

    return (
      <div className="space-y-6">
        <PageHeader
          title="Regnskab"
          description={`Forbundet med ${activeDef.label}. Aftaler, kunder og varer synkroniseres automatisk.`}
          action={
            <PrimaryButton onClick={handleSyncNow} disabled={syncing} icon={syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}>
              {syncing ? "Synkroniserer…" : "Synk nu"}
            </PrimaryButton>
          }
        />

        {/* Stats — samme rytme som Leads/Overblik */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Status"
            value={hasError ? "Fejl" : "Aktiv"}
            hint={hasError ? "Kræver opmærksomhed" : "Synkroniserer hver time"}
            icon={hasError ? <AlertCircle /> : <Check />}
            tone={hasError ? "amber" : "emerald"}
          />
          <StatCard
            label="Sidste synk"
            value={formatRelativeDanish(lastSync)}
            hint={lastSync ? new Date(lastSync).toLocaleString("da-DK") : "Endnu ikke synkroniseret"}
            icon={<Clock />}
            tone="blue"
          />
          <StatCard
            label="I synk-kø"
            value={queueCount}
            hint={queueCount === 0 ? "Alt er sendt afsted" : "Sendes ved næste synk"}
            icon={<ListChecks />}
            tone="violet"
          />
        </div>

        {/* Forbindelses-kort */}
        <SectionCard
          title="Forbundet program"
          icon={<Plug />}
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmSwitch(true)}
                className="h-8"
              >
                Skift program
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDisable(true)}
                className="h-8 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive active:bg-destructive/90"
              >
                <X className="mr-1.5 h-4 w-4" /> Afbryd
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-28 items-center justify-center rounded-lg border border-border bg-secondary/40 p-2">
              <img src={activeDef.logo} alt={activeDef.label} className="h-10 w-auto object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-semibold text-foreground">{activeDef.label}</div>
                {hasError ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" /> Fejl
                  </Badge>
                ) : (
                  <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 border-0 hover:bg-emerald-500/15 dark:text-emerald-400">
                    <Check className="h-3 w-3" /> Aktiv
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{activeDef.description}</p>
            </div>
          </div>

          {hasError && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <div className="font-medium">Sidste fejl</div>
                <div className="text-destructive/90 break-words">{integration.last_error}</div>
                {integration.last_error_at && (
                  <div className="mt-1 text-xs opacity-80">
                    {new Date(integration.last_error_at).toLocaleString("da-DK")}
                  </div>
                )}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Synk-indstillinger */}
        <SectionCard
          title="Synk-indstillinger"
          icon={<Settings2 />}
          description="Bestem hvordan og hvornår dine data sendes til regnskabsprogrammet."
          action={
            <Button size="sm" variant="outline" onClick={handleSaveSettingsOnly} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Gem
            </Button>
          }
        >
          <div className="divide-y divide-border">
            <div className="flex items-start justify-between gap-4 py-3 first:pt-0">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Send afventende aftaler</div>
                <p className="mt-0.5 text-xs text-muted-foreground">Hvis fra: kun bekræftede og færdige aftaler sendes.</p>
              </div>
              <Switch checked={settings.push_pending !== false}
                onCheckedChange={v => setSettings({ ...settings, push_pending: v })} />
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Auto-opret varer</div>
                <p className="mt-0.5 text-xs text-muted-foreground">Opret automatisk vare-nr i regnskabsprogrammet for hver service.</p>
              </div>
              <Switch checked={settings.auto_create_products !== false}
                onCheckedChange={v => setSettings({ ...settings, auto_create_products: v })} />
            </div>
            <div className="grid gap-4 py-3 sm:grid-cols-2 sm:gap-3 last:pb-0">
              <div>
                <FieldLabel>Standard betalingsfrist (dage)</FieldLabel>
                <Input type="number" min={0} value={settings.default_payment_terms_days ?? 14}
                  onChange={e => setSettings({ ...settings, default_payment_terms_days: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <FieldLabel>Standard moms-sats (%)</FieldLabel>
                <Input type="number" min={0} max={100} value={settings.default_vat_rate ?? 25}
                  onChange={e => setSettings({ ...settings, default_vat_rate: Number(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Log */}
        {logs.length > 0 ? (
          <SectionCard
            title="Seneste synkronisering"
            icon={<RefreshCw />}
            description="De sidste 15 hændelser. Bruges hvis noget driller."
          >
            <div className="divide-y divide-border text-sm">
              {logs.map(l => (
                <div key={l.id} className="flex flex-wrap items-center gap-2 py-2 first:pt-0 last:pb-0">
                  <Badge
                    variant={l.status === "success" ? "secondary" : l.status === "error" ? "destructive" : "outline"}
                    className="shrink-0 capitalize"
                  >
                    {l.status === "success" ? "Ok" : l.status === "error" ? "Fejl" : l.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {new Date(l.created_at).toLocaleString("da-DK")}
                  </span>
                  <span className="text-foreground capitalize">{l.direction} · {l.entity_type}</span>
                  {l.message && (
                    <span className="min-w-0 flex-1 truncate text-muted-foreground" title={l.message}>
                      {l.message}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        ) : (
          <SectionCard
            title="Seneste synkronisering"
            icon={<RefreshCw />}
          >
            <p className="text-sm text-muted-foreground">
              Ingen synkroniseringer endnu. Tryk på "Synk nu" øverst for at starte den første kørsel.
            </p>
          </SectionCard>
        )}

        {/* Bekræftelses-modaler */}
        <AlertDialog open={confirmDisable} onOpenChange={setConfirmDisable}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Afbryd integration?</AlertDialogTitle>
              <AlertDialogDescription>
                Vi stopper med at sende dine aftaler, kunder og varer til {activeDef.label}.
                Allerede synkroniserede data forbliver i {activeDef.label} — intet slettes.
                Du kan altid forbinde igen senere.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Behold integration</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDisable}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Ja, afbryd
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmSwitch} onOpenChange={setConfirmSwitch}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Skift regnskabsprogram?</AlertDialogTitle>
              <AlertDialogDescription>
                Du kan kun have ét regnskabsprogram forbundet ad gangen. Når du
                vælger et nyt, stopper synkronisering med {activeDef.label} —
                men dine data i begge systemer bevares.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Behold {activeDef.label}</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setConfirmSwitch(false); handleSwitchProvider(); }}>
                Vælg nyt program
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  /* ============================================================
   * WIZARD
   * ============================================================ */
  const stepsMeta = [
    { n: 1, label: "Vælg program", icon: Plug },
    { n: 2, label: "Forbind", icon: ShieldCheck },
    { n: 3, label: "Indstillinger", icon: Settings2 },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title={integration?.is_active ? "Skift regnskabsprogram" : "Forbind regnskabsprogram"}
        description="Vi guider dig igennem på 3 trin — det tager typisk under 2 minutter."
        action={
          <Button variant="ghost" size="sm" onClick={() => setMode("overview")}>
            <X className="mr-1.5 h-4 w-4" /> Annullér
          </Button>
        }
      />

      {/* Stepper */}
      <SectionCard className="bg-secondary/30">
        <div className="flex items-center gap-2">
          {stepsMeta.map((s, idx) => {
            const active = step === s.n;
            const done = step > s.n;
            const Icon = s.icon;
            return (
              <div key={s.n} className="flex flex-1 items-center gap-2">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  done ? "bg-foreground text-background border-foreground"
                  : active ? "border-foreground bg-background text-foreground"
                  : "border-border bg-background text-muted-foreground"
                }`}>
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className={`hidden text-sm sm:block ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  Trin {s.n} · {s.label}
                </div>
                {idx < stepsMeta.length - 1 && (
                  <div className={`mx-1 h-px flex-1 ${done ? "bg-foreground" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* TRIN 1 */}
      {step === 1 && (
        <SectionCard
          title="Vælg dit regnskabsprogram"
          icon={<Sparkles />}
          description="Du kan altid skifte program senere — alt forbliver gemt i Serviceydere."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROVIDERS.map(p => {
              const selected = provider === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => { setProvider(p.value); setCreds({}); setTestResult(null); }}
                  className={`group flex flex-col rounded-xl border p-4 text-left transition-colors ${
                    selected
                      ? "border-foreground bg-secondary/40 ring-2 ring-foreground/10"
                      : "border-border bg-card hover:border-foreground/30 hover:bg-secondary/20"
                  }`}
                >
                  <div className="flex h-16 items-center justify-center rounded-lg bg-background px-4">
                    <img src={p.logo} alt={p.label} className="h-9 w-auto object-contain" />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="font-semibold text-foreground">{p.label}</div>
                    {selected && (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{p.tagline}</div>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                </button>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* TRIN 2 */}
      {step === 2 && (
        <div className="grid gap-4 lg:grid-cols-[1fr,1.4fr]">
          <SectionCard
            title="Sådan finder du dine nøgler"
            icon={<img src={currentProvider.logo} alt="" className="h-4 w-auto" />}
            description={`Trin-for-trin guide til ${currentProvider.label}.`}
          >
            <ol className="space-y-3 text-sm">
              {currentProvider.setupSteps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">{i + 1}</span>
                  <span className="text-muted-foreground pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
            <a
              href={currentProvider.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              {currentProvider.helpUrlLabel} <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {currentProvider.note && (
              <div
                className={`mt-4 rounded-lg border p-3 text-xs ${
                  currentProvider.note.tone === "warning"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                    : "border-blue-500/20 bg-blue-500/5 text-foreground"
                }`}
              >
                <div className="font-semibold mb-1">{currentProvider.note.title}</div>
                <div className="opacity-90 leading-relaxed">{currentProvider.note.body}</div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="API-oplysninger"
            icon={<ShieldCheck />}
            description="Dine nøgler gemmes krypteret og bruges kun til synkronisering."
          >
            <div className="space-y-4">
              {currentProvider.fields.map(f => {
                const isPwd = f.type === "password";
                const reveal = !!showSecret[f.key];
                return (
                  <div key={f.key}>
                    <FieldLabel>{f.label}</FieldLabel>
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
                        <button
                          type="button"
                          onClick={() => setShowSecret(s => ({ ...s, [f.key]: !s[f.key] }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          aria-label={reveal ? "Skjul" : "Vis"}
                        >
                          {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                    {f.help && <p className="mt-1.5 text-xs text-muted-foreground">{f.help}</p>}
                  </div>
                );
              })}

              {testResult && (
                <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                  testResult.ok
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}>
                  {testResult.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                  <div className="min-w-0">
                    <div className="font-medium">{testResult.ok ? "Forbindelsen virker — du er klar!" : "Forbindelsen fejlede"}</div>
                    {testResult.message && <div className="opacity-90 break-words">{testResult.message}</div>}
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {credsValid ? "Klik 'Test forbindelse' for at tjekke at alt virker." : "Udfyld alle felter for at fortsætte."}
                </p>
                <Button
                  variant={testResult?.ok ? "outline" : "default"}
                  onClick={handleTest}
                  disabled={testing || !credsValid}
                >
                  {testing
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : testResult?.ok ? <RefreshCw className="mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  {testResult?.ok ? "Test igen" : "Test forbindelse"}
                </Button>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* TRIN 3 */}
      {step === 3 && (
        <SectionCard
          title="Synk-indstillinger"
          icon={<Settings2 />}
          description="Standardværdier der bruges når vi sender aftaler. Du kan altid ændre dem senere."
        >
          <div className="divide-y divide-border">
            <div className="flex items-start justify-between gap-4 py-3 first:pt-0">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Send afventende aftaler</div>
                <p className="mt-0.5 text-xs text-muted-foreground">Hvis fra: kun bekræftede og færdige aftaler sendes.</p>
              </div>
              <Switch checked={settings.push_pending !== false}
                onCheckedChange={v => setSettings({ ...settings, push_pending: v })} />
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Auto-opret varer</div>
                <p className="mt-0.5 text-xs text-muted-foreground">Opret automatisk vare-nr i regnskabsprogrammet for hver service.</p>
              </div>
              <Switch checked={settings.auto_create_products !== false}
                onCheckedChange={v => setSettings({ ...settings, auto_create_products: v })} />
            </div>
            <div className="grid gap-4 py-3 sm:grid-cols-2 sm:gap-3 last:pb-0">
              <div>
                <FieldLabel>Standard betalingsfrist (dage)</FieldLabel>
                <Input type="number" min={0} value={settings.default_payment_terms_days ?? 14}
                  onChange={e => setSettings({ ...settings, default_payment_terms_days: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <FieldLabel>Standard moms-sats (%)</FieldLabel>
                <Input type="number" min={0} max={100} value={settings.default_vat_rate ?? 25}
                  onChange={e => setSettings({ ...settings, default_vat_rate: Number(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Footer-navigation */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <Button
          variant="ghost"
          onClick={() => {
            if (step === 1) setMode("overview");
            else setStep((step - 1) as 1 | 2 | 3);
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {step === 1 ? "Tilbage til oversigt" : "Forrige"}
        </Button>

        {step < 3 ? (
          <PrimaryButton
            onClick={() => setStep((step + 1) as 1 | 2 | 3)}
            disabled={step === 2 && !testResult?.ok}
            title={step === 2 && !testResult?.ok ? "Test forbindelsen først" : undefined}
          >
            {step === 2 && !testResult?.ok ? "Test forbindelsen først" : "Næste"}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={handleSave} disabled={saving} icon={saving ? <Loader2 className="animate-spin" /> : <Check />}>
            {saving ? "Aktiverer…" : "Aktiver integration"}
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
