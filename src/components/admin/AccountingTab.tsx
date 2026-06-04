import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2, RefreshCw, Check, AlertCircle, ExternalLink, Eye, EyeOff,
  ArrowLeft, ArrowRight, Plug, Settings2, ShieldCheck, Calculator,
  Clock, ListChecks, Sparkles, X, Upload, Download, RotateCw, AlertTriangle,
  Copy, FolderTree, KeyRound, FlaskConical,
} from "lucide-react";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, HelpCircle, PartyPopper, SlidersHorizontal } from "lucide-react";
import {
  PageHeader, PrimaryButton, SectionCard, FieldLabel,
} from "@/components/admin/shared/AdminUI";
import { Skeleton } from "@/components/ui/skeleton";
import economicLogo from "@/assets/accounting/economic.png";
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

type Provider = "economic" | "dinero";

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
    tagline: "",
    description: "Klik her for at integrere din virksomhed med e-conomic som dit regnskabsprogram.",
    helpUrl: "https://www.e-conomic.com/developer",
    helpUrlLabel: "Åbn e-conomic udviklerside",
    fields: [
      { key: "api_secret", label: "Hemmelig kode (App Secret Token)", type: "password",
        help: "Den hemmelige kode du får i e-conomic, når du opretter din egen lille forbindelse (kaldes 'App Secret Token').", placeholder: "Indsæt koden her" },
      { key: "api_token", label: "Adgangsnøgle til din aftale (Grant Token)", type: "password",
        help: "Den nøgle du får, når du installerer forbindelsen på din e-conomic-aftale (kaldes 'Agreement Grant Token').", placeholder: "Indsæt nøglen her" },
    ],
    setupSteps: [
      "Åbn e-conomics udviklerside via linket nedenfor og log ind med din almindelige e-conomic-bruger.",
      "Klik 'Create new app' og kald den fx 'Serviceydere'. Sæt flueben ved Customers, Products og Sales Orders.",
      "Du får nu en hemmelig kode ('App Secret Token') — kopiér den og indsæt i feltet herunder.",
      "Tryk 'Install on agreement' øverst og vælg din e-conomic-aftale.",
      "Du får nu en adgangsnøgle ('Agreement Grant Token') — kopiér den ind i feltet herunder.",
      "Tryk 'Test forbindelse' — så tjekker vi at alt virker, før vi gemmer.",
    ],
    note: {
      tone: "info",
      title: "Hvorfor skal jeg selv oprette forbindelsen?",
      body: "e-conomic kræver at hver forbindelse oprettes inde i din egen aftale. Det er gratis, tager ca. 2 minutter, og du sparer e-conomics månedlige app-gebyr.",
    },
  },
  {
    value: "dinero",
    label: "Dinero",
    logo: dineroLogo,
    tagline: "",
    description: "Klik her for at integrere din virksomhed med Dinero som dit regnskabsprogram.",
    helpUrl: "https://developer.dinero.dk/",
    helpUrlLabel: "Åbn Dineros udviklerside",
    fields: [
      { key: "api_token", label: "Bruger-ID (Client ID)", type: "text",
        help: "Du får dette når du opretter en forbindelse på Dineros udviklerside (kræver Dinero Pro).", placeholder: "Indsæt dit Bruger-ID" },
      { key: "api_secret", label: "Hemmelig kode (Client Secret)", type: "password",
        help: "Den hemmelige kode du får sammen med Bruger-ID. Vises kun én gang i Dinero — kopiér den med det samme.", placeholder: "Indsæt den hemmelige kode" },
      { key: "organization_id", label: "Dit Dinero-nummer", type: "text",
        help: "De 6 tal du ser i adresselinjen, når du er logget ind på Dinero (fx app.dinero.dk/198765/…).", placeholder: "fx 198765" },
    ],
    setupSteps: [
      "Tjek at din Dinero-konto er på 'Pro'-pakken — det er den eneste pakke, der tillader automatisk forbindelse.",
      "Log ind på Dinero og find dit Dinero-nummer i adresselinjen (de 6 tal efter 'app.dinero.dk/').",
      "Åbn Dineros udviklerside via linket nedenfor og log ind med din almindelige Dinero-bruger.",
      "Opret en ny forbindelse ('API integration') og giv adgang til kunder, varer og bilag (Contacts, Products, Vouchers).",
      "Kopiér Bruger-ID og den hemmelige kode ind i felterne herunder — den hemmelige kode vises kun én gang!",
      "Skriv dit Dinero-nummer i sidste felt og tryk 'Test forbindelse'.",
    ],
    note: {
      tone: "warning",
      title: "Kræver Dinero Pro-abonnement",
      body: "Dinero tillader kun automatisk forbindelse for kunder på Pro-pakken. Har du Small eller Medium, skal du først opgradere via Dinero → Indstillinger → Abonnement — ellers afvises forbindelsen.",
    },
  },
];

function syncErrorMessage(result: { data?: unknown; error?: unknown }, fallback: string): string | null {
  const dataError = (result.data as any)?.error;
  if (dataError) return String(dataError);
  const err = result.error as any;
  if (!err) return null;
  const contextError = err?.context?.error ?? err?.context?.message;
  if (contextError) return String(contextError);
  const message = err?.message ? String(err.message) : fallback;
  const match = message.match(/\{"error":"([\s\S]*?)"\}/);
  return match?.[1] ? match[1].replace(/\\"/g, '"') : message;
}

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
  paused_until?: string | null;
  consecutive_failures?: number | null;
  settings: {
    push_pending?: boolean;
    default_payment_terms_days?: number;
    default_vat_rate?: number;
    auto_create_products?: boolean;
    send_order_as?: "order" | "invoice_draft" | "quote";
    default_customer_group?: string;
    default_product_group?: string;
    default_income_account?: string;
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

/**
 * Lille selvstændig komponent der re-renderer sig selv hvert minut for at
 * holde "X min siden"-teksten retvisende. Det erstatter en tidligere
 * setInterval i hele AccountingTab-komponenten, der hvert minut tvang ~2500
 * linjers JSX til at re-render bare for at opdatere et par små spans.
 */
const RelativeTime: React.FC<{ iso: string | null }> = React.memo(({ iso }) => {
  const [, tick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  return <>{formatRelativeDanish(iso)}</>;
});
RelativeTime.displayName = "RelativeTime";

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
  product: "Service",
  order: "Aftale",
  connection: "Forbindelse",
};

const OPERATION_LABEL: Record<string, string> = {
  upsert: "blev sendt",
  delete: "blev slettet",
  push: "blev sendt",
  pull: "blev hentet",
};

function operationDanish(op: string): string {
  return OPERATION_LABEL[op] ?? op;
}

// GuideStep blev tidligere brugt i hver ConnectCard, men dupliker­ede de
// trin der allerede står i venstre "Sådan fungerer det"-kolonne. Trinene
// vises nu kun ét sted (sidecard'et) — selve forbindelses-kortet
// koncentrerer sig om handlingen.

/**
 * ConnectCardShell — fælles ramme for alle tre forbind-kort, så designet
 * føles konsistent. Header med logo + program-navn, valgfri "kræver"-badge,
 * og en pæn body-area.
 */
const ConnectCardShell = React.forwardRef<HTMLDivElement, {
  logo: string;
  name: string;
  tagline: string;
  requiresBadge?: string;
  children: React.ReactNode;
}>(({ logo, name, children }, ref) => {
  return (
    <div ref={ref} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-4 border-b border-border bg-secondary/40 px-5 py-4">
        <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl bg-background ring-1 ring-border p-2">
          <img src={logo} alt={name} className="max-h-7 max-w-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-foreground">Forbind {name}</div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
});
ConnectCardShell.displayName = "ConnectCardShell";

/** Lille statusbadge der diskret viser om indstillingerne er gemt. */
function AutoSaveBadge({
  state,
  loadingGroups = false,
}: {
  state: "idle" | "saving" | "saved" | "error";
  loadingGroups?: boolean;
}) {
  if (loadingGroups) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Henter…
      </span>
    );
  }
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Gemmer…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Check className="h-3 w-3 text-emerald-600" /> Gemt
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" /> Kunne ikke gemme
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground">Gemmes automatisk</span>
  );
}

/**
 * SuccessCard — fælles "du er forbundet!"-tilstand, så alle tre udbydere
 * føles identisk på succes-trinnet.
 */
function SuccessCard({ name }: { name: string }) {
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
        <PartyPopper className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Du er forbundet med {name}!</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Vi har testet at synk virkelig virker, og sat alt op for dig. Dine kunder, services og aftaler synkroniseres nu automatisk.
      </p>
    </div>
  );
}

/**
 * EconomicConnectCard — guidet OAuth-lignende flow for e-conomic.
 */
const EconomicConnectCard = React.forwardRef<
  HTMLDivElement,
  {
    onConnect: () => void;
    connecting: boolean;
    waiting: boolean;
    connectResult: { ok: boolean; message?: string } | null;
  }
>(({ onConnect, connecting, waiting, connectResult }, ref) => {
  return (
    <div ref={ref}>
      <ConnectCardShell logo={economicLogo} name="e-conomic" tagline="Ét-klik forbindelse — tager under 30 sekunder">
        <div className="space-y-5">
          <Button onClick={onConnect} disabled={connecting} size="lg" className="w-full">
            {connecting
              ? <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              : <ExternalLink className="mr-2 h-5 w-5" />}
            {connecting ? "Forbinder…" : "Forbind e-conomic"}
          </Button>

          {waiting && !connectResult?.ok && (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-sm text-foreground">
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              <div className="min-w-0">
                <div className="font-medium">Venter på godkendelse i e-conomic…</div>
                <div className="opacity-80 text-xs mt-0.5">Et nyt vindue er åbnet. Log ind, vælg din aftale og tryk "Tildel adgang".</div>
              </div>
            </div>
          )}

          {connectResult && (
            <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
              connectResult.ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}>
              {connectResult.ok ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
              <div className="min-w-0">
                <div className="font-medium">{connectResult.ok ? "E-conomic er forbundet!" : "Forbindelsen kunne ikke gennemføres"}</div>
                {connectResult.message && <div className="break-words opacity-90">{connectResult.message}</div>}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            🔒 Du kan altid tilbagekalde adgangen i e-conomic under <strong>Indstillinger → Integrationer → Apps</strong>.
          </p>
        </div>
      </ConnectCardShell>
    </div>
  );
});
EconomicConnectCard.displayName = "EconomicConnectCard";

/**
 * DineroConnectCard — guidet API-nøgle-flow.
 *
 * Dinero har ikke offentlig OAuth, så vi bruger deres "API-nøgle" som
 * Pro-kunder selv kan oprette i Dinero. Vi viser den eksakte step-by-step
 * guide, og brugeren paster så Client ID + Secret + organisations-ID.
 */
const DineroConnectCard = React.forwardRef<HTMLDivElement, {
  apiToken: string;
  apiSecret: string;
  organizationId: string;
  showSecret: boolean;
  onToggleSecret: () => void;
  onChange: (field: "api_token" | "api_secret" | "organization_id", value: string) => void;
  onConnect: () => void;
  status: "idle" | "checking" | "testing" | "saving" | "done" | "error";
  errorMessage: string | null;
}>(({ apiToken, apiSecret, organizationId, showSecret, onToggleSecret, onChange, onConnect, status, errorMessage }, _ref) => {
  const isWorking = status === "checking" || status === "testing" || status === "saving";
  const statusLabel =
    status === "checking" ? "Tjekker forbindelsen til Dinero…" :
    status === "testing"  ? "Sender testdata til Dinero…" :
    status === "saving"   ? "Sætter alt op for dig…" :
    null;

  const credsValid =
    apiToken.trim().length > 0 &&
    apiSecret.trim().length > 0 &&
    organizationId.trim().length > 0;

  if (status === "done") return <SuccessCard name="Dinero" />;

  return (
    <ConnectCardShell logo={dineroLogo} name="Dinero" tagline="">
      <div className="space-y-5">
        <Button asChild variant="outline" size="lg" className="w-full">
          <a href="https://app.dinero.dk/" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Åbn Dinero i nyt vindue
          </a>
        </Button>

        <div className="space-y-3">
          <div>
            <FieldLabel required>Bruger-ID (Client ID)</FieldLabel>
            <Input
              type="text"
              value={apiToken}
              onChange={(e) => onChange("api_token", e.target.value)}
              placeholder="Indsæt Bruger-ID fra Dinero"
              autoComplete="off"
              disabled={isWorking}
              className="h-11"
            />
          </div>
          <div>
            <FieldLabel required>Hemmelig kode (Client Secret)</FieldLabel>
            <div className="relative">
              <Input
                type={showSecret ? "text" : "password"}
                value={apiSecret}
                onChange={(e) => onChange("api_secret", e.target.value)}
                placeholder="Indsæt den hemmelige kode"
                autoComplete="off"
                disabled={isWorking}
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={onToggleSecret}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label={showSecret ? "Skjul" : "Vis"}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Den hemmelige kode vises kun én gang i Dinero — husk at kopiere den med det samme.</p>
          </div>
          <div>
            <FieldLabel required>Dit Dinero-nummer</FieldLabel>
            <Input
              type="text"
              value={organizationId}
              onChange={(e) => onChange("organization_id", e.target.value)}
              placeholder="fx 198765"
              autoComplete="off"
              disabled={isWorking}
              className="h-11"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              De 6 tal du ser i adresselinjen efter <code>app.dinero.dk/</code>, når du er logget ind.
            </p>
          </div>
        </div>

        <Button onClick={onConnect} disabled={!credsValid || isWorking} size="lg" className="w-full">
          {isWorking
            ? <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            : <Plug className="mr-2 h-5 w-5" />}
          {isWorking ? "Forbinder…" : "Forbind Dinero"}
        </Button>

        {isWorking && statusLabel && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/40 py-3 text-sm font-medium text-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {statusLabel}
          </div>
        )}

        {status === "error" && errorMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <div className="font-medium">Det virkede desværre ikke</div>
              <div className="mt-0.5 break-words opacity-90">{errorMessage}</div>
              <div className="mt-1.5 text-xs opacity-80">Tjek at alle tre felter er udfyldt korrekt — eller opret en ny forbindelse i Dinero.</div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          🔒 Vi gemmer kun det vi har brug for, og du kan altid slette nøglen igen i Dinero.
        </p>
      </div>
    </ConnectCardShell>
  );
});
DineroConnectCard.displayName = "DineroConnectCard";

export default function AccountingTab({ businessId }: { businessId: string; businessName: string }) {
  const navigate = useNavigate();
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [mode, setMode] = useState<Mode>("overview");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [provider, setProvider] = useState<Provider>("economic");
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [economicConnecting, setEconomicConnecting] = useState(false);
  // Neutral info-besked mens popup'en er åben — vi viser den IKKE som "forbundet"
  // men som ventestatus, så brugeren ikke tror integrationen allerede virker.
  const [economicWaiting, setEconomicWaiting] = useState(false);
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
  const [dryRunning, setDryRunning] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<{
    ok: boolean;
    steps?: Array<{
      key: string;
      label: string;
      ok: boolean;
      message?: string;
      external_number?: string | null;
      duration_ms?: number;
    }>;
    note?: string;
    error?: string;
  } | null>(null);
  const [resumingPause, setResumingPause] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Dinero paste-and-go: én samlet status fra "udfyldt" til "færdig opsat".
  const [dineroStatus, setDineroStatus] = useState<
    "idle" | "checking" | "testing" | "saving" | "done" | "error"
  >("idle");
  const [dineroError, setDineroError] = useState<string | null>(null);
  // Dinero OAuth (kun aktiv når Dinero har godkendt Serviceydere som partner-app)
  const [dineroOAuthEnabled, setDineroOAuthEnabled] = useState(false);
  const [dineroOAuthConnecting, setDineroOAuthConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [failedJobs, setFailedJobs] = useState<any[]>([]);
  const [dlqJobs, setDlqJobs] = useState<any[]>([]);
  const [dlqActionId, setDlqActionId] = useState<string | null>(null);
  const [pushedLast24h, setPushedLast24h] = useState(0);
  const [pulledLast24h, setPulledLast24h] = useState(0);
  const [lastSuccessPush, setLastSuccessPush] = useState<string | null>(null);
  const [groups, setGroups] = useState<{
    customer_groups: { id: string; name: string }[];
    product_groups: { id: string; name: string; account_number?: string | null }[];
    income_accounts: { id: string; name: string }[];
    labels?: {
      customer_groups?: string;
      product_groups?: string;
      income_accounts?: string;
      customer_groups_help?: string;
      product_groups_help?: string;
      income_accounts_help?: string;
    };
  }>({ customer_groups: [], product_groups: [], income_accounts: [], labels: {} });
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [lastSuccessPull, setLastSuccessPull] = useState<string | null>(null);
  // Re-render hvert minut så "om X min"-tæller forbliver retvisende
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNowTick(n => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const setupRunRef = useRef(0);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  // Auto-save status: vises diskret i sektion-headeren så brugeren altid
  // kan se om hans ændring er nået sikkert frem.
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const currentProvider = useMemo(
    () => PROVIDERS.find(p => p.value === provider)!,
    [provider],
  );

  const resetWizardState = (clearCredentials = true) => {
    setupRunRef.current += 1;
    if (clearCredentials) setCreds({});
    setShowSecret({});
    setTestResult(null);
    setDryRunResult(null);
    setDineroStatus("idle");
    setDineroError(null);
    setEconomicConnecting(false);
    setEconomicWaiting(false);
    setTesting(false);
    setDryRunning(false);
    try { sessionStorage.removeItem("economic_pending_business_id"); } catch { /* ignore */ }
    try { sessionStorage.removeItem("dinero_pending_business_id"); } catch { /* ignore */ }
  };

  const chooseProvider = (nextProvider: Provider) => {
    resetWizardState(true);
    setProvider(nextProvider);
    setStep(2);
    setMode("wizard");
  };

  const load = async (options?: { preserveMode?: boolean }) => {
    setLoading(true);
    const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // Parallel batch — alle queries er uafhængige, så vi sparer ~7 round-trips.
    const [
      { data },
      { data: log },
      { count },
      { data: failed },
      { data: dlq },
      pushedCountRes,
      pulledCountRes,
      lastPushRes,
      lastPullRes,
    ] = await Promise.all([
      supabase.from("accounting_integrations" as any)
        .select("id, business_id, provider, is_active, agreement_number, organization_id, last_pull_at, last_push_at, last_error, last_error_at, settings, consecutive_failures, paused_until, last_kick_at, created_at, updated_at")
        .eq("business_id", businessId).maybeSingle(),
      supabase.from("accounting_sync_log" as any)
        .select("*").eq("business_id", businessId)
        .order("created_at", { ascending: false }).limit(15),
      supabase.from("accounting_sync_queue" as any)
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId).in("status", ["pending", "failed"]),
      supabase.from("accounting_sync_queue" as any)
        .select("*").eq("business_id", businessId).eq("status", "failed")
        .order("updated_at", { ascending: false }).limit(20),
      supabase.from("accounting_sync_dlq" as any)
        .select("*").eq("business_id", businessId).eq("resolved", false)
        .order("moved_to_dlq_at", { ascending: false }).limit(50),
      supabase.from("accounting_sync_log" as any)
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId).eq("status", "success").eq("direction", "push")
        .gte("created_at", since24),
      supabase.from("accounting_sync_log" as any)
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId).eq("status", "success").eq("direction", "pull")
        .gte("created_at", since24),
      supabase.from("accounting_sync_log" as any)
        .select("created_at").eq("business_id", businessId)
        .eq("status", "success").eq("direction", "push")
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("accounting_sync_log" as any)
        .select("created_at").eq("business_id", businessId)
        .eq("status", "success").eq("direction", "pull")
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (data) {
      const d = data as any as Integration;
      setIntegration(d);
      setProvider(d.provider);
      setCreds({
        api_token: d.api_token ?? "", api_secret: d.api_secret ?? "",
        agreement_number: d.agreement_number ?? "", organization_id: d.organization_id ?? "",
      });
      setSettings({ ...defaultSettings, ...(d.settings ?? {}) });
      if (!options?.preserveMode) setMode("overview");
    } else {
      setIntegration(null);
      if (!options?.preserveMode) setMode("overview");
    }
    setLogs((log as any) ?? []);
    setQueueCount(count ?? 0);
    setFailedJobs((failed as any) ?? []);
    setDlqJobs((dlq as any) ?? []);
    setPushedLast24h(pushedCountRes.count ?? 0);
    setPulledLast24h(pulledCountRes.count ?? 0);
    setLastSuccessPush((lastPushRes.data as any)?.created_at ?? null);
    setLastSuccessPull((lastPullRes.data as any)?.created_at ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [businessId]);

  // Auto-pull: når regnskabsfanen åbnes (eller skifter business) henter vi
  // de seneste ændringer fra regnskabsprogrammet i baggrunden, så brugeren
  // altid ser opdaterede data uden at trykke på en knap. Push-retningen
  // sker allerede automatisk via DB-triggers ved hver insert/update/delete.
  useEffect(() => {
    if (!integration?.is_active) return;
    let cancelled = false;
    (async () => {
      try {
        await supabase.functions.invoke("accounting-sync", {
          body: { business_id: businessId, mode: "pull" },
        });
        if (!cancelled) await load({ preserveMode: true });
      } catch {
        // Stille fejl — næste cron-kørsel forsøger igen
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration?.is_active, businessId]);

  const loadGroups = async () => {
    if (!integration) return;
    setGroupsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("accounting-list-groups", {
        body: { business_id: businessId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setGroups({
        customer_groups: (data as any)?.customer_groups ?? [],
        product_groups: (data as any)?.product_groups ?? [],
        income_accounts: (data as any)?.income_accounts ?? [],
        labels: (data as any)?.labels ?? {},
      });
    } catch (e: any) {
      // Stille fejl — feltet falder bare tilbage til "tom liste"
      console.warn("Kunne ikke hente kategorier fra regnskabsprogram:", e?.message);
    } finally {
      setGroupsLoading(false);
    }
  };

  // Hent grupper én gang når integrationen er aktiv (eller skifter udbyder)
  useEffect(() => {
    if (integration?.is_active) loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration?.is_active, integration?.provider]);

  const startWizard = (preselect?: Provider) => {
    if (preselect) {
      setProvider(preselect);
      // Klik på et program skal åbne opsætningen med det samme — ingen ekstra "Næste".
      setStep(2);
    } else {
      setStep(1);
    }
    resetWizardState(true);
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

  // Dry-run: opret testkunde + testvare + kladdefaktura i regnskabsprogrammet,
  // ryd op bagefter. Kører helt uden at gemme noget i Serviceydere.
  const handleDryRun = async () => {
    setDryRunning(true);
    setDryRunResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("accounting-dry-run", {
        body: { business_id: businessId, provider, api_token: creds.api_token },
      });
      if (error) throw error;
      const r = data as typeof dryRunResult;
      setDryRunResult(r);
      if (r?.ok) toast.success("Synk-test gennemført — alt virker!");
      else toast.error("Synk-testen stoppede — se trinene for detaljer.");
    } catch (e: any) {
      const msg = e?.message ?? "Kunne ikke køre synk-test";
      setDryRunResult({ ok: false, error: msg });
      toast.error(msg);
    } finally {
      setDryRunning(false);
    }
  };

  /**
   * Dinero "udfyld og forbind"-flow.
   *  1) testConnection
   *  2) dry-run (rigtige testdata frem og tilbage)
   *  3) gem + hent grupper og auto-vælg første indtægtskonto
   *  4) afslut til oversigt; ellers fald til step 3 hvis ingen konto fundet
   */
  const handleDineroAutoConnect = async () => {
    const runId = ++setupRunRef.current;
    const api_token = (creds.api_token ?? "").trim();
    const api_secret = (creds.api_secret ?? "").trim();
    const organization_id = (creds.organization_id ?? "").trim();
    if (!api_token || !api_secret || !organization_id) return;
    setDineroError(null);

    // 1) Test forbindelse
    setDineroStatus("checking");
    try {
      const { data, error } = await supabase.functions.invoke("accounting-test-connection", {
        body: { business_id: businessId, provider: "dinero", api_token, api_secret, organization_id, settings },
      });
      if (runId !== setupRunRef.current) return;
      if (error) throw error;
      const r = data as { ok: boolean; message?: string };
      if (!r.ok) throw new Error(r.message ?? "Login-oplysningerne kunne ikke bruges");
    } catch (e: any) {
      if (runId !== setupRunRef.current) return;
      setDineroError(e?.message ?? "Kunne ikke forbinde til Dinero");
      setDineroStatus("error");
      return;
    }

    // 2) Dry-run: send rigtige testdata til Dinero
    setDineroStatus("testing");
    try {
      const { data, error } = await supabase.functions.invoke("accounting-dry-run", {
        body: { business_id: businessId, provider: "dinero", api_token, api_secret, organization_id },
      });
      if (runId !== setupRunRef.current) return;
      if (error) throw error;
      const r = data as { ok: boolean; steps?: { ok: boolean; label: string; message?: string }[] };
      if (!r.ok) {
        const failed = r.steps?.find(s => !s.ok);
        throw new Error(failed?.message ?? "Synk-testen kunne ikke gennemføres");
      }
    } catch (e: any) {
      if (runId !== setupRunRef.current) return;
      setDineroError(e?.message ?? "Synk-testen fejlede");
      setDineroStatus("error");
      return;
    }

    // 3) Gem og hent grupper
    setDineroStatus("saving");
    let autoIncomeAccount: string | null = null;
    try {
      const { error: saveErr } = await supabase.functions.invoke("accounting-integration-state", {
        body: {
          action: "save",
          business_id: businessId,
          provider: "dinero",
          api_token,
          api_secret,
          organization_id,
          settings: { ...defaultSettings },
        },
      });
      if (runId !== setupRunRef.current) return;
      if (saveErr) throw saveErr;

      const { data: g } = await supabase.functions.invoke("accounting-list-groups", {
        body: { business_id: businessId },
      });
      if (runId !== setupRunRef.current) return;
      const incomeAccounts = ((g as any)?.income_accounts ?? []) as { id: string }[];
      if (incomeAccounts.length > 0) autoIncomeAccount = incomeAccounts[0].id;
    } catch {
      // Ikke kritisk — fald tilbage til manuelt valg nedenfor
    }

    // 4) Afslut
    if (autoIncomeAccount) {
      const finalSettings = { ...defaultSettings, default_income_account: autoIncomeAccount };
      try {
        await supabase.from("accounting_integrations" as any)
          .update({ settings: finalSettings as any })
          .eq("business_id", businessId);
        if (runId !== setupRunRef.current) return;
        setSettings(finalSettings);
        setProvider("dinero");
        setDineroStatus("done");
        toast.success("Dinero er forbundet og klar!");
        runFullSync(businessId).catch(() => { /* ignoreres */ });
        setTimeout(async () => {
          if (runId !== setupRunRef.current) return;
          await load();
          if (runId !== setupRunRef.current) return;
          setMode("overview");
        }, 1400);
      } catch (e: any) {
        if (runId !== setupRunRef.current) return;
        setDineroError(e?.message ?? "Kunne ikke gemme indstillinger");
        setDineroStatus("error");
      }
    } else {
      // Ingen konti fundet — bed brugeren vælge i step 3
      setProvider("dinero");
      setSettings({ ...defaultSettings });
      setDineroStatus("idle");
      setStep(3);
      await load({ preserveMode: true });
      toast.info("Næsten klar — vælg lige en indtægtskonto");
    }
  };

  /**
   * Dinero OAuth — spejler e-conomic-flowet. Aktiveres automatisk når
   * `accounting-dinero-callback` returnerer `enabled: true` (dvs. når
   * server-secrets DINERO_CLIENT_ID/SECRET/REDIRECT_URL er sat).
   * Indtil da forbliver knappen skjult og brugeren ser Smart Paste-flowet.
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke(
          "accounting-dinero-callback",
          { body: { action: "install_url", business_id: businessId } },
        );
        if (!cancelled && (data as any)?.enabled === true) {
          setDineroOAuthEnabled(true);
        }
      } catch { /* OAuth er bare ikke aktiveret endnu */ }
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  const handleDineroOAuthConnect = async () => {
    const runId = ++setupRunRef.current;
    setDineroOAuthConnecting(true);
    setDineroError(null);
    const popup = window.open("about:blank", "dinero_connect");
    if (popup) {
      try {
        popup.document.write(
          `<!doctype html><html lang="da"><head><meta charset="utf-8"><title>Forbinder til Dinero…</title>` +
          `<style>body{font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}` +
          `.box{text-align:center}.spinner{width:32px;height:32px;border:3px solid #334155;border-top-color:#22d3ee;border-radius:50%;animation:s 1s linear infinite;margin:0 auto 16px}` +
          `@keyframes s{to{transform:rotate(360deg)}}</style></head>` +
          `<body><div class="box"><div class="spinner"></div><div>Sender dig til Dinero…</div></div></body></html>`
        );
      } catch { /* ignore */ }
    }
    try {
      sessionStorage.setItem("dinero_pending_business_id", businessId);
      const { data, error } = await supabase.functions.invoke(
        "accounting-dinero-callback",
        { body: { action: "install_url", business_id: businessId, prepare: true } },
      );
      if (runId !== setupRunRef.current) return;
      if (error) throw error;
      const url = (data as any)?.install_url;
      if (!url) throw new Error("Ét-klik forbindelse til Dinero er ikke klar endnu — udfyld felterne manuelt i stedet.");
      if (popup && !popup.closed) {
        popup.location.href = url;
      } else {
        window.location.href = url;
        return;
      }
      setDineroOAuthConnecting(false);
    } catch (e: any) {
      if (runId !== setupRunRef.current) return;
      if (popup && !popup.closed) popup.close();
      sessionStorage.removeItem("dinero_pending_business_id");
      const msg = e?.message ?? "Kunne ikke åbne Dinero";
      setDineroError(msg);
      toast.error(msg);
      setDineroOAuthConnecting(false);
    }
  };

  /**
   * E-conomic-flow:
   *  1) Brugeren trykker "Forbind e-conomic" — vi henter Installations URL'en
   *     fra serveren og åbner den i et nyt vindue.
   *  2) E-conomic redirecter brugeren tilbage til /virksomhed?economicToken=XXX
   *     i samme vindue eller forældervinduet.
   *  3) En separat useEffect (se nedenfor) opfanger query-parametret, kalder
   *     edge function, og gemmer integrationen.
   */
  const handleEconomicConnect = async () => {
    const runId = ++setupRunRef.current;
    setEconomicConnecting(true);
    setTestResult(null);
    setEconomicWaiting(false);
    // VIGTIGT: Vi åbner popup'en synkront her — direkte i klik-handleren —
    // så browseren ser det som en bruger-gesture og ikke blokerer den.
    // Bagefter henter vi install-URL'en og navigerer popup'en derhen.
    // Hvis vi i stedet awaitede først og åbnede popup'en bagefter, ville
    // Chrome/Safari blokere vinduet (popup blocker).
    const popup = window.open("about:blank", "economic_connect");
    if (popup) {
      try {
        popup.document.write(
          `<!doctype html><html lang="da"><head><meta charset="utf-8"><title>Forbinder til e-conomic…</title>` +
          `<style>body{font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}` +
          `.box{text-align:center}.spinner{width:32px;height:32px;border:3px solid #334155;border-top-color:#22d3ee;border-radius:50%;animation:s 1s linear infinite;margin:0 auto 16px}` +
          `@keyframes s{to{transform:rotate(360deg)}}</style></head>` +
          `<body><div class="box"><div class="spinner"></div><div>Sender dig til e-conomic…</div></div></body></html>`
        );
      } catch { /* cross-origin write kan fejle, ignorér */ }
    }
    try {
      // Husk hvilken business der skal bindes når brugeren kommer tilbage
      sessionStorage.setItem("economic_pending_business_id", businessId);
      const { data, error } = await supabase.functions.invoke(
        "accounting-economic-callback",
        { body: { action: "install_url", business_id: businessId } },
      );
      if (runId !== setupRunRef.current) return;
      if (error) throw error;
      const url = (data as any)?.install_url;
      if (!url) throw new Error("Kunne ikke hente e-conomic install-URL");
      // Naviger den allerede-åbnede popup til e-conomic.
      if (popup && !popup.closed) {
        popup.location.href = url;
      } else {
        // Popup blev blokeret eller lukket — fald tilbage til samme-tab redirect.
        // Det er sidste udvej; brugeren kommer naturligt tilbage via redirectUrl.
        window.location.href = url;
        return;
      }
      setEconomicConnecting(false);
      // Neutral ventestatus — IKKE en succes-besked. Først når token rent
      // faktisk er valideret af edge function viser vi "forbundet".
      setEconomicWaiting(true);
    } catch (e: any) {
      if (runId !== setupRunRef.current) return;
      if (popup && !popup.closed) popup.close();
      sessionStorage.removeItem("economic_pending_business_id");
      const msg = e?.message ?? "Kunne ikke åbne e-conomic";
      setTestResult({ ok: false, message: msg });
      toast.error(msg);
      setEconomicConnecting(false);
      setEconomicWaiting(false);
    }
  };

  // Opfang ?economicToken=… (eller ?token=…) når brugeren kommer tilbage fra
  // e-conomic. Hvis vi er i popup-vinduet (window.opener findes), sender vi
  // tokenet videre til hovedvinduet via postMessage og lukker os selv. Hvis
  // vi ER hovedvinduet (popup'en blev blokeret og vi faldt tilbage til
  // same-tab redirect), håndterer vi det selv.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("economicToken") || params.get("token");
    if (!token) return;

    // Hvis vi er i popup'en — send token til opener og luk vinduet.
    // window.opener er null hvis brugeren har lukket hovedvinduet, eller
    // hvis vi blev åbnet med noopener. I så fald håndterer hovedvinduet
    // det selv ved næste mount.
    if (window.opener && !window.opener.closed && window.opener !== window) {
      try {
        window.opener.postMessage(
          { type: "economic_token", token, businessId },
          window.location.origin,
        );
        // Ryd URL'en før vi lukker, så hvis lukning fejler, ser brugeren
        // ikke et token i adresselinjen.
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("economicToken");
        cleanUrl.searchParams.delete("token");
        window.history.replaceState({}, "", cleanUrl.toString());
        window.close();
        return;
      } catch (e) {
        console.error("[economic] kunne ikke sende token til opener:", e);
      }
    }

    const pendingBiz = sessionStorage.getItem("economic_pending_business_id");
    if (!pendingBiz) return;
    if (pendingBiz !== businessId) return;

    sessionStorage.removeItem("economic_pending_business_id");
    // Ryd tokenet ud af URL'en så det ikke ligger og lurer
    // Brug react-router-navigate så Admin.tsx faktisk skifter til accounting-fanen
    // (replaceState alene opdaterer ikke React Router's location).
    navigate("/virksomhed?tab=accounting", { replace: true });

    setProvider("economic");
    setMode("wizard");
    setStep(2);
    setEconomicConnecting(true);
    setEconomicWaiting(false);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "accounting-economic-callback",
          { body: { business_id: businessId, agreement_grant_token: token } },
        );
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        const companyName = (data as any)?.company_name;
        setTestResult({
          ok: true,
          message: companyName ? `Forbundet til ${companyName}` : "E-conomic er forbundet og klar.",
        });
        toast.success("E-conomic er nu forbundet!");
        await load();
        // Spring direkte til oversigten med aktiv integration — ingen unødigt step 3.
        setMode("overview");
      } catch (e: any) {
        const msg = e?.message ?? "Kunne ikke gemme e-conomic-forbindelsen";
        setTestResult({ ok: false, message: msg });
        toast.error(msg);
      } finally {
        setEconomicConnecting(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  // Lyt efter postMessage fra popup-vinduet (e-conomic-redirect lander dér,
  // og popup'en sender tokenet videre hertil før den lukker).
  useEffect(() => {
    const onMessage = async (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return;
      const data = ev.data;
      if (!data || data.type !== "economic_token" || !data.token) return;
      if (data.businessId && data.businessId !== businessId) return;
      const pendingBiz = sessionStorage.getItem("economic_pending_business_id");
      if (pendingBiz !== businessId) return;
      sessionStorage.removeItem("economic_pending_business_id");
      setProvider("economic");
      setMode("wizard");
      setStep(2);
      setEconomicConnecting(true);
      setEconomicWaiting(false);
      try {
        const { data: resp, error } = await supabase.functions.invoke(
          "accounting-economic-callback",
          { body: { business_id: businessId, agreement_grant_token: data.token } },
        );
        if (error) throw error;
        if ((resp as any)?.error) throw new Error((resp as any).error);
        const companyName = (resp as any)?.company_name;
        setTestResult({
          ok: true,
          message: companyName ? `Forbundet til ${companyName}` : "E-conomic er forbundet og klar.",
        });
        toast.success("E-conomic er nu forbundet!");
        // Naviger med react-router så Admin.tsx faktisk viser regnskabs-fanen.
        navigate("/virksomhed?tab=accounting", { replace: true });
        await load();
        setMode("overview");
      } catch (e: any) {
        const msg = e?.message ?? "Kunne ikke gemme e-conomic-forbindelsen";
        setTestResult({ ok: false, message: msg });
        toast.error(msg);
      } finally {
        setEconomicConnecting(false);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("accounting-integration-state", {
        body: {
          action: "save",
          business_id: businessId,
          provider,
          api_token: creds.api_token || null,
          api_secret: creds.api_secret || null,
          agreement_number: creds.agreement_number || null,
          organization_id: creds.organization_id || null,
          settings: settings as any,
        },
      });
      if (error) throw error;
      toast.success(`${currentProvider.label} er nu integreret`);
      // Stille første synk i baggrunden — ingen toasts. Realtime-trigger
      // overtager fremadrettet ved rigtige ændringer.
      runFullSync(businessId).catch(() => { /* fejl vises via load() */ });
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Kunne ikke gemme");
    } finally { setSaving(false); }
  };

  // Auto-save: hver gang `settings` ændres efter integrationen er indlæst,
  // gemmer vi stille i baggrunden 600ms efter sidste ændring. Ingen knap,
  // ingen toast — kun en lille "Gemt"-indikator i sektion-headeren, så
  // siden føles ligeså let som "Indstillinger"-fanen.
  // Sammenlign mod sidst gemte snapshot for ikke at gemme uændret tilstand
  // (fx ved første load) eller når brugeren bare åbner siden.
  const lastSavedSettingsRef = (globalThis as any).__acct_last_saved ??
    ((globalThis as any).__acct_last_saved = { current: "" });
  useEffect(() => {
    if (!integration?.is_active || loading) return;
    const snap = JSON.stringify(settings ?? {});
    if (snap === lastSavedSettingsRef.current) return;
    // Første snapshot efter load skal ikke trigge save
    if (lastSavedSettingsRef.current === "") {
      lastSavedSettingsRef.current = snap;
      return;
    }
    setAutoSaveState("saving");
    const t = setTimeout(async () => {
      try {
        const { error } = await supabase.from("accounting_integrations" as any)
          .update({ settings: settings as any })
          .eq("business_id", businessId);
        if (error) throw error;
        lastSavedSettingsRef.current = snap;
        setAutoSaveState("saved");
        // Skjul "Gemt"-mærket efter et par sekunder
        setTimeout(() => setAutoSaveState(s => s === "saved" ? "idle" : s), 2000);
      } catch (e: any) {
        setAutoSaveState("error");
        toast.error(e?.message ?? "Kunne ikke gemme");
      }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, integration?.is_active, businessId, loading]);

  // Nulstil snapshot når vi skifter business eller indlæser igen
  useEffect(() => {
    lastSavedSettingsRef.current = "";
    setAutoSaveState("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const handleDisable = async () => {
    if (!integration) return;
    const { error } = await supabase.functions.invoke("accounting-integration-state", {
      body: { action: "disconnect", business_id: businessId },
    });
    if (error) {
      toast.error(error.message ?? "Kunne ikke frakoble integrationen");
      return;
    }
    toast.success("Integration afbrudt");
    setIntegration(null);
    setCreds({});
    setSettings(defaultSettings);
    setLogs([]);
    setFailedJobs([]);
    setDlqJobs([]);
    setQueueCount(0);
    await load();
  };

  const openProviderPicker = () => {
    resetWizardState(true);
    setStep(1);
    setMode("wizard");
  };

  // Marker job som pending igen og kør synk med det samme. Bruges fra
  // fejl-sektionen under hver fejlende række.
  const handleRetryJob = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      // Hvis der allerede findes en aktiv (pending/processing) række for
      // samme entitet, vil et flip til pending bryde
      // uq_sync_queue_active_entity. Slet den fejlende række i stedet —
      // den aktive overtager arbejdet.
      const { data: jobRow } = await supabase.from("accounting_sync_queue" as any)
        .select("business_id, entity_type, entity_id").eq("id", jobId).maybeSingle();
      if (jobRow) {
        const j = jobRow as any;
        const { data: dup } = await supabase.from("accounting_sync_queue" as any)
          .select("id")
          .eq("business_id", j.business_id)
          .eq("entity_type", j.entity_type)
          .eq("entity_id", j.entity_id)
          .in("status", ["pending", "processing"])
          .neq("id", jobId)
          .limit(1)
          .maybeSingle();
        if (dup) {
          await supabase.from("accounting_sync_queue" as any).delete().eq("id", jobId);
        } else {
          const { error } = await supabase.from("accounting_sync_queue" as any)
            .update({ status: "pending", scheduled_for: new Date().toISOString(), last_error: null })
            .eq("id", jobId);
          if (error) throw error;
        }
      }
      const r = await supabase.functions.invoke("accounting-sync", {
        body: { business_id: businessId, mode: "queue" },
      });
      const syncError = syncErrorMessage(r, "Kunne ikke prøve igen");
      if (syncError) throw new Error(syncError);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Kunne ikke prøve igen");
    } finally { setRetryingJobId(null); }
  };

  const handleRetryAllFailed = async () => {
    if (failedJobs.length === 0) return;
    setSyncing(true);
    try {
      // Slet først fejlede rækker hvis samme entitet allerede har en aktiv
      // række — ellers ville flip til pending bryde uq_sync_queue_active_entity.
      const { data: failed } = await supabase.from("accounting_sync_queue" as any)
        .select("id, entity_type, entity_id")
        .eq("business_id", businessId).eq("status", "failed");
      const { data: active } = await supabase.from("accounting_sync_queue" as any)
        .select("entity_type, entity_id")
        .eq("business_id", businessId)
        .in("status", ["pending", "processing"]);
      const activeKeys = new Set<string>((active ?? []).map((r: any) => `${r.entity_type}:${r.entity_id}`));
      const dupIds: string[] = [];
      const freshIds: string[] = [];
      for (const f of (failed ?? []) as any[]) {
        if (activeKeys.has(`${f.entity_type}:${f.entity_id}`)) dupIds.push(f.id);
        else freshIds.push(f.id);
      }
      if (dupIds.length > 0) {
        await supabase.from("accounting_sync_queue" as any).delete().in("id", dupIds);
      }
      if (freshIds.length > 0) {
        await supabase.from("accounting_sync_queue" as any)
          .update({ status: "pending", scheduled_for: new Date().toISOString(), last_error: null })
          .in("id", freshIds);
      }
      const r = await supabase.functions.invoke("accounting-sync", {
        body: { business_id: businessId, mode: "queue" },
      });
      const syncError = syncErrorMessage(r, "Kunne ikke prøve igen");
      if (syncError) throw new Error(syncError);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Kunne ikke prøve igen");
    } finally { setSyncing(false); }
  };

  // DLQ-handlers: retry sender jobbet tilbage i køen, dismiss arkiverer det
  const handleDlqRetry = async (dlqId: string) => {
    setDlqActionId(dlqId);
    try {
      const { error } = await supabase.rpc("retry_dlq_job" as any, { _dlq_id: dlqId });
      if (error) throw error;
      toast.success("Job sendt tilbage i køen");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Kunne ikke prøve igen");
    } finally { setDlqActionId(null); }
  };

  const handleDlqDismiss = async (dlqId: string) => {
    setDlqActionId(dlqId);
    try {
      const { error } = await supabase.rpc("dismiss_dlq_job" as any, { _dlq_id: dlqId, _note: "Markeret som håndteret" });
      if (error) throw error;
      toast.success("Markeret som håndteret");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Kunne ikke opdatere");
    } finally { setDlqActionId(null); }
  };

  async function runFullSync(bizId: string) {
    // Kør push (queue-drain) først så pull ikke overskriver lokale ændringer
    const r1 = await supabase.functions.invoke("accounting-sync", { body: { business_id: bizId, mode: "queue" } });
    const pushError = syncErrorMessage(r1, "Push fejlede");
    if (pushError) throw new Error(pushError);
    const r2 = await supabase.functions.invoke("accounting-sync", { body: { business_id: bizId, mode: "pull" } });
    const pullError = syncErrorMessage(r2, "Hent fejlede");
    if (pullError) throw new Error(pullError);
    return {
      pushed: (r1.data as any)?.processed ?? 0,
      seeded: (r1.data as any)?.seeded ?? 0,
      pulledCustomers: (r2.data as any)?.customers ?? 0,
      pulledProducts: (r2.data as any)?.products ?? 0,
    };
  }

  /** Genoptag synk efter auto-pause uden at vente på cron */
  const handleResumePause = async () => {
    setResumingPause(true);
    try {
      await supabase.from("accounting_integrations" as any)
        .update({ paused_until: null, consecutive_failures: 0 })
        .eq("business_id", businessId);
      await supabase.functions.invoke("accounting-sync", {
        body: { business_id: businessId, mode: "queue" },
      });
      toast.success("Synk er genoptaget");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Kunne ikke genoptage synk");
    } finally {
      setResumingPause(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* PageHeader skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        {/* Hero/status banner skeleton — matcher layout for både ny + aktiv tilstand */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-full max-w-md" />
              <div className="flex flex-wrap gap-3 pt-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="hidden shrink-0 gap-2 sm:flex">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
        </div>
        {/* Provider grid / sektion skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex h-24 items-center justify-center border-b border-border bg-secondary/30">
                <Skeleton className="h-8 w-32" />
              </div>
              <div className="space-y-3 p-5">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-32 mt-2" />
              </div>
            </div>
          ))}
        </div>
        {/* Sektion-card skeleton (settings / log) */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-5 w-48" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-8 w-40" />
              </div>
            ))}
          </div>
        </div>
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
          description="Forbind dit regnskabsprogram, så kunder, services og aftaler holder sig opdateret begge steder — automatisk."
        />

        {/* Forklarende top-banner i stedet for tom EmptyState + grid.
            Et roligt hero-felt sætter forventningen, og kortene nedenfor
            er selve handlingen. */}
        <div className="rounded-2xl border border-border bg-gradient-to-br from-secondary/40 to-card p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
              <Calculator className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-foreground">Vælg dit regnskabsprogram</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Det tager under 2 minutter. Vi guider dig gennem opsætningen og tester at alt virker — du behøver ingen teknisk viden.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Krypteret forbindelse</span>
                <span className="inline-flex items-center gap-1.5"><RotateCw className="h-3.5 w-3.5" /> Synkroniseres automatisk</span>
                <span className="inline-flex items-center gap-1.5"><X className="h-3.5 w-3.5" /> Frakobl når som helst</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDERS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => startWizard(p.value)}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex h-24 items-center justify-center border-b border-border bg-gradient-to-b from-secondary/50 to-secondary/20 px-6">
                <img src={p.logo} alt={p.label} className="max-h-10 max-w-[150px] object-contain" />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-foreground">{p.label}</div>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-foreground transition-all group-hover:bg-foreground group-hover:text-background">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" /> Tager under 2 minutter
                </div>
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
    const nextRun = nextHourlyRun();
    const failedCount = failedJobs.length;
    const pendingCount = Math.max(queueCount - failedCount, 0);

    return (
      <div className="space-y-6">
        <PageHeader
          title="Regnskab"
          description={`Du er forbundet med ${activeDef.label}. Det hele kører af sig selv.`}
        />

        {/* Stor, rolig statusbanner i toppen — én tydelig besked til brugeren
            i stedet for 6 forskellige tal og labels. */}
        {(() => {
          const isHealthy = failedCount === 0 && !hasError;
          const nextRunTxt = nextRun.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
          return (
            <div
              className={`rounded-2xl border p-5 sm:p-6 ${
                isHealthy
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-amber-500/40 bg-amber-500/10"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
               <div className="flex items-start gap-4 min-w-0 flex-1">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                    isHealthy ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/20 text-amber-700"
                  }`}
                >
                  {isHealthy ? <Check className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {isHealthy
                        ? `${activeDef.label} er forbundet`
                        : failedCount > 0
                          ? `${failedCount} ting kunne ikke sendes`
                          : `Vi kunne ikke nå ${activeDef.label}`}
                    </h3>
                    <img src={activeDef.logo} alt={activeDef.label} className="h-5 w-auto object-contain opacity-80" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isHealthy
                      ? "Alt kører automatisk i baggrunden."
                      : "Se herunder — det er som regel en lille rettelse, så er det løst."}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Upload className="h-3.5 w-3.5" />
                      <strong className="font-semibold text-foreground tabular-nums">{pushedLast24h}</strong> sendt i dag
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Download className="h-3.5 w-3.5" />
                      <strong className="font-semibold text-foreground tabular-nums">{pulledLast24h}</strong> hentet i dag
                    </span>
                    {pendingCount > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <ListChecks className="h-3.5 w-3.5" />
                        <strong className="font-semibold text-foreground tabular-nums">{pendingCount}</strong> venter
                      </span>
                    )}
                  </div>
                </div>
               </div>
                {showAdvanced && (
                <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row [&>button]:w-full sm:[&>button]:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={syncing}
                    onClick={async () => {
                      if (!businessId) return;
                      setSyncing(true);
                      try {
                        const r = await supabase.functions.invoke("accounting-sync", {
                          body: { business_id: businessId, mode: "queue" },
                        });
                        const syncError = syncErrorMessage(r, "Push fejlede");
                        if (syncError) throw new Error(syncError);
                        const pushed = (r.data as any)?.processed ?? 0;
                        toast.success(`Sendt til ${activeDef.label}: ${pushed} kunder push'et.`);
                        await load();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Push fejlede");
                      } finally {
                        setSyncing(false);
                      }
                    }}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Send til {activeDef.label}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={syncing}
                    onClick={async () => {
                      if (!businessId) return;
                      setSyncing(true);
                      try {
                        const r = await supabase.functions.invoke("accounting-sync", {
                          body: { business_id: businessId, mode: "pull" },
                        });
                        const syncError = syncErrorMessage(r, "Hent fejlede");
                        if (syncError) throw new Error(syncError);
                        const pulled = (r.data as any)?.customers ?? 0;
                        toast.success(`Hentet fra ${activeDef.label}: ${pulled} kunder opdateret lokalt.`);
                        await load();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Hent fejlede");
                      } finally {
                        setSyncing(false);
                      }
                    }}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Hent fra {activeDef.label}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={syncing}
                    onClick={async () => {
                      if (!businessId) return;
                      setSyncing(true);
                      try {
                        const r = await runFullSync(businessId);
                        toast.success(
                          `Synkronisering færdig — ${r.pushed} sendt, ${r.pulledCustomers} hentet.`,
                        );
                        await load();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Synkronisering fejlede");
                      } finally {
                        setSyncing(false);
                      }
                    }}
                  >
                    {syncing ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCw className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Kør begge veje
                  </Button>
                </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Auto-pause banner — synk er midlertidigt sat på pause efter mange fejl i træk */}
        {integration.paused_until && new Date(integration.paused_until) > new Date() && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">
                Synk er midlertidigt sat på pause
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Vi stoppede automatikken efter {integration.consecutive_failures ?? "flere"} fejl i træk for at undgå at spamme {activeDef.label}.
                Genoptages automatisk {new Date(integration.paused_until).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={resumingPause}
              onClick={handleResumePause}
              className="shrink-0"
            >
              {resumingPause ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RotateCw className="mr-1.5 h-3.5 w-3.5" />}
              Genoptag nu
            </Button>
          </div>
        )}

        {/* Detaljeret push/pull-status — én række pr. retning, så brugeren med ét blik
            kan se hvad der virker og hvad der fejler. */}
        {showAdvanced && (
        <SectionCard
          title="Forbindelsesstatus"
          icon={<ShieldCheck />}
          description={`Sådan står det til lige nu mellem Serviceydere og ${activeDef.label}.`}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {/* PUSH */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-foreground">
                  <Upload className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">Sender til {activeDef.label}</div>
                  <div className="text-xs text-muted-foreground">Push: kunder, services og aftaler</div>
                </div>
                {failedJobs.length === 0 && !!lastSuccessPush ? (
                  <Badge variant="secondary" className="gap-1 shrink-0 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20">
                    <Check className="h-3 w-3" /> Virker
                  </Badge>
                ) : failedJobs.length > 0 ? (
                  <Badge variant="destructive" className="gap-1 shrink-0">
                    <AlertCircle className="h-3 w-3" /> Fejler
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0">Venter</Badge>
                )}
              </div>
              <dl className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Sidst lykkedes</dt>
                  <dd className="text-foreground tabular-nums">{formatRelativeDanish(lastSuccessPush)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Sidste forsøg</dt>
                  <dd className="text-foreground tabular-nums">{formatRelativeDanish(integration.last_push_at)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Sendt seneste 24 t.</dt>
                  <dd className="text-foreground tabular-nums">{pushedLast24h}</dd>
                </div>
                {failedJobs.length > 0 && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Fejler nu</dt>
                    <dd className="text-destructive tabular-nums font-medium">{failedJobs.length}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* PULL */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-foreground">
                  <Download className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">Henter fra {activeDef.label}</div>
                  <div className="text-xs text-muted-foreground">Pull: ændringer i regnskabsprogrammet</div>
                </div>
                {!!lastSuccessPull && !hasError ? (
                  <Badge variant="secondary" className="gap-1 shrink-0 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20">
                    <Check className="h-3 w-3" /> Virker
                  </Badge>
                ) : hasError ? (
                  <Badge variant="destructive" className="gap-1 shrink-0">
                    <AlertCircle className="h-3 w-3" /> Fejler
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0">Venter</Badge>
                )}
              </div>
              <dl className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Sidst lykkedes</dt>
                  <dd className="text-foreground tabular-nums">{formatRelativeDanish(lastSuccessPull)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Sidste forsøg</dt>
                  <dd className="text-foreground tabular-nums">{formatRelativeDanish(integration.last_pull_at)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Hentet seneste 24 t.</dt>
                  <dd className="text-foreground tabular-nums">{pulledLast24h}</dd>
                </div>
              </dl>
            </div>
          </div>

        </SectionCard>
        )}

        {/* Forbindelsesfejl — kun hvis noget er galt på selve forbindelsen */}
        {hasError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">Vi kunne ikke nå dit regnskabsprogram</div>
              <div className="text-destructive/90 break-words">{integration.last_error}</div>
              {integration.last_error_at && (
                <div className="mt-1 text-xs opacity-80">
                  Sidste forsøg: {new Date(integration.last_error_at).toLocaleString("da-DK")}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fejlende jobs — kun synlig hvis der faktisk er noget at handle på.
            Hvert job viser entity-type, det interne id (kopierbart), den præcise
            fejltekst fra adapteren og hvornår det sidst fejlede. */}
        {failedJobs.length > 0 && (
          <SectionCard
            title={`Disse kunne ikke sendes til ${activeDef.label}`}
            icon={<AlertTriangle />}
            description="Vi prøvede automatisk, men noget gik galt. Læs hvad der er sket, ret det evt. og tryk 'Prøv igen'. De fleste fejl skyldes en stavefejl (fx en ugyldig email eller manglende CVR), eller at noget endnu ikke er sat op i dit regnskabsprogram."
            action={
              <Button
                variant="outline"
                onClick={handleRetryAllFailed}
                disabled={syncing}
                className="h-9 rounded-lg text-xs font-medium"
              >
                {syncing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RotateCw className="mr-1.5 h-3.5 w-3.5" />}
                Prøv alle igen
              </Button>
            }
          >
            <div className="divide-y divide-border">
              {failedJobs.map(job => (
                <div key={job.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="destructive" className="gap-1 shrink-0">
                        <AlertCircle className="h-3 w-3" />
                        {ENTITY_LABEL[job.entity_type] ?? job.entity_type}
                      </Badge>
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {operationDanish(job.operation)} ikke
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatRelativeDanish(job.updated_at)}
                      </span>
                    </div>
                    <div className="break-words rounded-md border border-destructive/20 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive">
                      {job.last_error || "Ukendt fejl"}
                    </div>
                    <details className="group">
                      <summary className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground select-none">
                        Vis tekniske detaljer
                      </summary>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(job.entity_id);
                          toast.success("Reference kopieret");
                        }}
                        className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                        title="Klik for at kopiere — gem den hvis du kontakter support"
                      >
                        <Copy className="h-3 w-3" />
                        Reference: {job.entity_id}
                      </button>
                    </details>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleRetryJob(job.id)}
                    disabled={retryingJobId === job.id}
                    className="h-9 rounded-lg text-xs font-medium sm:w-auto"
                  >
                    {retryingJobId === job.id
                      ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      : <RotateCw className="mr-1.5 h-3.5 w-3.5" />}
                    Prøv igen
                  </Button>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Fejl-indbakke (DLQ) — jobs der gav op efter 5 forsøg.
            Forhindrer at køen bliver "forurenet" af håbløse jobs samtidig med at
            ejeren får en handlingsklar liste over hvad der kræver manuel opmærksomhed. */}
        {dlqJobs.length > 0 && (
          <SectionCard
            title="Skal håndteres manuelt"
            icon={<AlertTriangle />}
            description="Vi har prøvet at sende disse fem gange uden held, så vi har stoppet automatikken for dem. Læs fejlen og vælg om vi skal prøve igen, eller tryk 'Jeg har ordnet det' hvis du selv har klaret det inde i dit regnskabsprogram."
          >
            <div className="divide-y divide-border">
              {dlqJobs.map(job => (
                <div key={job.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="gap-1 shrink-0 border-destructive/30 text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        {ENTITY_LABEL[job.entity_type] ?? job.entity_type}
                      </Badge>
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {operationDanish(job.operation)} ikke · {formatRelativeDanish(job.moved_to_dlq_at)}
                      </span>
                    </div>
                    <div className="break-words rounded-md border border-destructive/20 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive">
                      {job.last_error || "Ukendt fejl"}
                    </div>
                    <details className="group">
                      <summary className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground select-none">
                        Vis tekniske detaljer
                      </summary>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(job.entity_id); toast.success("Reference kopieret"); }}
                        className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                        title="Klik for at kopiere — gem den hvis du kontakter support"
                      >
                        <Copy className="h-3 w-3" />
                        Reference: {job.entity_id}
                      </button>
                    </details>
                  </div>
                  <div className="flex gap-2 sm:flex-col">
                    <Button
                      variant="outline"
                      onClick={() => handleDlqRetry(job.id)}
                      disabled={dlqActionId === job.id}
                      className="h-9 rounded-lg text-xs font-medium"
                    >
                      {dlqActionId === job.id
                        ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        : <RotateCw className="mr-1.5 h-3.5 w-3.5" />}
                      Prøv igen
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDlqDismiss(job.id)}
                      disabled={dlqActionId === job.id}
                      className="h-9 rounded-lg text-xs font-medium text-muted-foreground"
                    >
                      Jeg har ordnet det
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Synlige standardvalg — ikke gemt bag “avanceret”, fordi det er her
            brugeren forstår hvad automatikken gør og kan ændre de vigtigste valg. */}
        {showAdvanced && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground">Automatik og standardvalg</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Her styrer du hvad der sendes, og hvilke standarder vi bruger i {activeDef.label}.
              </p>
            </div>
          </div>

        <SectionCard
          title="Hvad skal sendes automatisk?"
          icon={<Settings2 />}
          description="Ændringer gemmes automatisk."
          action={<AutoSaveBadge state={autoSaveState} />}
        >
          <div className="divide-y divide-border">
            <div className="flex items-start justify-between gap-4 py-3 first:pt-0">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Send nye kundeforespørgsler som kladder</div>
                <p className="mt-0.5 text-xs text-muted-foreground">Når en kunde sender en forespørgsel, kan vi oprette den som kladde i {activeDef.label}. Slå fra hvis kun bekræftede aftaler skal med.</p>
              </div>
              <Switch checked={settings.push_pending !== false}
                onCheckedChange={v => setSettings({ ...settings, push_pending: v })} />
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Hold dine services opdateret som varer</div>
                <p className="mt-0.5 text-xs text-muted-foreground">Når du opretter eller ændrer en service her, sørger vi for at den også findes som vare i {activeDef.label}.</p>
              </div>
              <Switch checked={settings.auto_create_products !== false}
                onCheckedChange={v => setSettings({ ...settings, auto_create_products: v })} />
            </div>
            <div className="grid gap-4 py-3 sm:grid-cols-2 sm:gap-3 last:pb-0">
              <div>
                <FieldLabel required>Hvor mange dage må kunden om at betale?</FieldLabel>
                <Input type="number" min={0} value={settings.default_payment_terms_days ?? 14}
                  onChange={e => setSettings({ ...settings, default_payment_terms_days: Number(e.target.value) || 0 })} />
                <p className="mt-1.5 text-xs text-muted-foreground">Bruges på nye fakturaer. 14 dage er standard i Danmark.</p>
              </div>
              <div>
                <FieldLabel required>Moms-sats i procent</FieldLabel>
                <Input type="number" min={0} max={100} value={settings.default_vat_rate ?? 25}
                  onChange={e => setSettings({ ...settings, default_vat_rate: Number(e.target.value) || 0 })} />
                <p className="mt-1.5 text-xs text-muted-foreground">25 % er almindelig moms i Danmark.</p>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Standard kundegruppe/indtægtskonto hentet fra regnskabsprogrammet */}
        <SectionCard
          title="Hvor skal nye kunder og services placeres?"
          icon={<FolderTree />}
          description="Når vi opretter en ny kunde eller service i dit regnskabsprogram, bruger vi disse valg. Listen er hentet direkte fra dit regnskabsprogram — opret nye grupper dér, så dukker de automatisk op her."
          action={<AutoSaveBadge state={autoSaveState} loadingGroups={groupsLoading} />}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.customer_groups.length > 0 && (
              <div>
                <FieldLabel optional>
                  Hvor skal nye kunder placeres?
                </FieldLabel>
                <Select
                  value={settings.default_customer_group ?? ""}
                  onValueChange={v => setSettings({ ...settings, default_customer_group: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vælg en gruppe…" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.customer_groups.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {groups.labels?.customer_groups_help
                    ?? `Hedder "${groups.labels?.customer_groups ?? "Kundegruppe"}" i dit regnskabsprogram.`}
                </p>
              </div>
            )}
            {groups.product_groups.length > 0 && (
              <div>
                <FieldLabel optional>
                  Hvor skal nye services placeres?
                </FieldLabel>
                <Select
                  value={settings.default_product_group ?? ""}
                  onValueChange={v => setSettings({ ...settings, default_product_group: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vælg en gruppe…" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.product_groups.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {groups.labels?.product_groups_help
                    ?? `Hedder "${groups.labels?.product_groups ?? "Produktgruppe"}" i dit regnskabsprogram.`}
                </p>
              </div>
            )}
            {groups.income_accounts.length > 0 && (
              <div className="sm:col-span-2">
                <FieldLabel optional>
                  Hvilken konto skal indtægterne bogføres på?
                </FieldLabel>
                <Select
                  value={settings.default_income_account ?? ""}
                  onValueChange={v => setSettings({ ...settings, default_income_account: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vælg en konto…" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.income_accounts.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {groups.labels?.income_accounts_help
                    ?? "Det er som regel en konto i 1000-serien (omsætning). Spørg din revisor hvis du er i tvivl."}
                </p>
              </div>
            )}
            {groups.customer_groups.length === 0 &&
             groups.product_groups.length === 0 &&
             groups.income_accounts.length === 0 && (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                {groupsLoading
                  ? "Henter grupper fra dit regnskabsprogram…"
                  : "Vi fandt ingen grupper i dit regnskabsprogram. Opret dem dér — så dukker de automatisk op her."}
              </p>
            )}
          </div>
        </SectionCard>
        </div>
        )}

        {/* Aktiv forbindelse — viser hvilket regnskabsprogram der er
            forbundet, en kort identitet (organisations-id / nøgle-hale)
            og to klare handlinger: skift program eller frakobl helt.
            Bruger den samme visuelle ramme som connect-kortene i wizarden,
            så det føles sammenhængende. */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-secondary/30 px-5 py-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl bg-background ring-1 ring-border p-2">
                <img src={activeDef.logo} alt={activeDef.label} className="max-h-7 max-w-full object-contain" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-foreground">{activeDef.label}</span>
                  <Badge variant="secondary" className="gap-1 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20">
                    <Check className="h-3 w-3" /> Aktiv
                  </Badge>
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {integration.organization_id
                    ? <>{activeDef.value === "dinero" ? "Dinero-nummer" : "Organisation"} <span className="font-medium text-foreground/80">{integration.organization_id}</span></>
                    : integration.agreement_number
                      ? <>Aftalenummer <span className="font-medium text-foreground/80">{integration.agreement_number}</span></>
                      : "Forbundet"}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openProviderPicker}
                className="h-9 rounded-lg text-xs font-medium"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Skift program
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDisable(true)}
                className="h-9 rounded-lg border-destructive/30 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
              >
                <X className="mr-1.5 h-3.5 w-3.5" /> Frakobl
              </Button>
            </div>
          </div>
          <div className="px-5 py-3 text-xs text-muted-foreground">
            Hvis du skifter program nu, beholder vi alt det du allerede har sendt — der bliver ikke slettet noget i {activeDef.label}.
          </div>
        </div>

        {/* Log */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(v => !v)}
            className="text-xs text-muted-foreground"
          >
            {showAdvanced ? "Skjul avancerede indstillinger" : "Vis avancerede indstillinger"}
            <ChevronDown className={`ml-1 h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          </Button>
        </div>

        {showAdvanced && (logs.length > 0 ? (
          <SectionCard
            title="Hvad er der sket på det seneste?"
            icon={<RefreshCw />}
            description="Her ser du de seneste 15 gange vi har sendt eller hentet noget. Det er en god hjælp hvis du vil tjekke om noget bestemt er kommet med."
          >
            <div className="divide-y divide-border text-sm">
              {logs.map(l => (
                <div key={l.id} className="flex flex-wrap items-center gap-2 py-2 first:pt-0 last:pb-0">
                  <Badge
                    variant={l.status === "success" ? "secondary" : l.status === "error" ? "destructive" : "outline"}
                    className="shrink-0 capitalize"
                  >
                    {l.status === "success" ? "Lykkedes" : l.status === "error" ? "Mislykkedes" : l.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {new Date(l.created_at).toLocaleString("da-DK")}
                  </span>
                  <span className="text-foreground">
                    {ENTITY_LABEL[l.entity_type] ?? l.entity_type}
                    {" "}
                    {l.direction === "push" ? `sendt til ${activeDef.label}` : l.direction === "pull" ? `hentet fra ${activeDef.label}` : l.direction}
                  </span>
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
            title="Hvad er der sket på det seneste?"
            icon={<RefreshCw />}
          >
            <p className="text-sm text-muted-foreground">
              Der er ikke sket noget endnu. Så snart du opretter eller ændrer en kunde, en service eller en aftale, går det i gang helt af sig selv — du behøver ikke trykke på noget.
            </p>
          </SectionCard>
        ))}

        {/* Bekræftelses-modaler */}
        <AlertDialog open={confirmDisable} onOpenChange={setConfirmDisable}>
          <AlertDialogContent className="rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Frakobl {activeDef.label}?
              </AlertDialogTitle>
              <AlertDialogDescription className="leading-relaxed">
                Vi stopper med at synkronisere med {activeDef.label}. Du kan altid forbinde igen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <ul className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
              <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> Alt det du allerede har sendt bliver liggende i {activeDef.label}.</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> Dine kunder, services og aftaler i Serviceydere røres ikke.</li>
              <li className="flex gap-2"><X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" /> Nye ændringer sendes ikke længere automatisk til {activeDef.label}.</li>
            </ul>
            <AlertDialogFooter>
              <AlertDialogCancel className="h-9 rounded-lg text-sm font-medium">
                Behold forbindelsen
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDisable}
                className="h-9 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive"
              >
                Ja, frakobl
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
  return (
    <div className="space-y-6">
      <PageHeader
        title={integration?.is_active ? "Skift regnskabsprogram" : "Forbind regnskabsprogram"}
        description="Det tager under 2 minutter, og vi guider dig hele vejen — du behøver ingen teknisk viden."
        action={
          <Button
            variant="outline"
            onClick={() => setMode("overview")}
            className="h-9 rounded-lg text-xs font-medium"
          >
            <X className="mr-1.5 h-4 w-4" /> Annullér
          </Button>
        }
      />

      {/* TRIN 1 */}
      {step === 1 && (
        <SectionCard
          title="Hvilket regnskabsprogram bruger du?"
          icon={<Sparkles />}
          description="Du kan altid skifte program senere. Alt du har lavet i Serviceydere bliver liggende uanset hvad."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROVIDERS.map(p => {
              const isCurrent = integration?.is_active && integration.provider === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => chooseProvider(p.value)}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isCurrent && (
                    <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-500/30">
                      <Check className="h-2.5 w-2.5" /> Nuværende
                    </span>
                  )}
                  <div className="flex h-24 items-center justify-center border-b border-border bg-gradient-to-b from-secondary/50 to-secondary/20 px-6">
                    <img src={p.logo} alt={p.label} className="max-h-10 max-w-[150px] object-contain" />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-foreground">{p.label}</div>
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-foreground transition-all group-hover:bg-foreground group-hover:text-background">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
                    <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" /> Tager under 2 minutter
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* TRIN 2 */}
      {step === 2 && (
        <div className={
          provider === "economic" || provider === "dinero"
            ? "grid gap-4 lg:grid-cols-[1fr,1.2fr] xl:grid-cols-[1fr,1.1fr]"
            : "mx-auto max-w-2xl"
        }>
          {/* Venstre kolonne: hjælp & forklaring (kun på desktop, ellers
              ovenfor connect-kortet på mobil) */}
          {(provider === "economic" || provider === "dinero") && (
            <SectionCard
              title="Sådan fungerer det"
              icon={<img src={currentProvider.logo} alt="" className="h-4 w-auto" />}
              description={`Dette tager typisk under et minut.`}
              className="bg-secondary/30 lg:sticky lg:top-4 lg:self-start"
            >
              <ol className="space-y-3 text-sm">
                {(provider === "dinero"
                  ? [
                      "Log ind i Dinero og gå til 'Integrationer' i menuen til venstre.",
                      "Klik 'Se og opret API-nøgler' og opret en ny forbindelse (kald den fx 'Serviceydere').",
                      "Kopiér Bruger-ID og den hemmelige kode — den vises kun én gang!",
                      "Indsæt dem her sammen med dit Dinero-nummer, og tryk 'Forbind Dinero'.",
                    ]
                  : [
                      "Vi åbner e-conomic i et nyt vindue.",
                      "Du logger ind og vælger den aftale du vil forbinde Serviceydere med.",
                      "Du trykker 'Tildel adgang' i e-conomic.",
                      "Du sendes automatisk tilbage hertil, og vi gør resten.",
                    ]
                ).map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">{i + 1}</span>
                    <span className="pt-0.5 text-muted-foreground">{s}</span>
                  </li>
                ))}
              </ol>
              {provider === "dinero" && currentProvider.note && (
                <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                  <div className="font-semibold mb-1">{currentProvider.note.title}</div>
                  <div className="opacity-90 leading-relaxed">{currentProvider.note.body}</div>
                </div>
              )}
              <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs leading-relaxed text-foreground/80">
                <div className="mb-1 flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> Sikkert og krypteret
                </div>
                Vi gemmer kun det vi har brug for, og du kan altid tilbagekalde adgangen direkte i {currentProvider.label}.
              </div>
            </SectionCard>
          )}

          {provider === "economic" || provider === "dinero" ? (
            <div>
              {provider === "economic" ? (
                <EconomicConnectCard
                  onConnect={handleEconomicConnect}
                  connecting={economicConnecting}
                  waiting={economicWaiting}
                  connectResult={testResult}
                />
              ) : (
                <DineroConnectCard
                  apiToken={creds.api_token ?? ""}
                  apiSecret={creds.api_secret ?? ""}
                  organizationId={creds.organization_id ?? ""}
                  showSecret={!!showSecret.api_secret}
                  onToggleSecret={() => setShowSecret(s => ({ ...s, api_secret: !s.api_secret }))}
                  onChange={(field, value) => {
                    setCreds({ ...creds, [field]: value });
                    if (dineroStatus === "error") { setDineroStatus("idle"); setDineroError(null); }
                  }}
                  onConnect={handleDineroAutoConnect}
                  status={dineroStatus}
                  errorMessage={dineroError}
                />
              )}
            </div>
          ) : (
            <SectionCard
              title="Indtast dine login-oplysninger"
              icon={<ShieldCheck />}
              description="Dine oplysninger gemmes sikkert og krypteret. De bruges kun til at sende og hente data fra dit regnskabsprogram."
            >
              <div className="space-y-4">
                <>
                  {currentProvider.fields.map(f => {
                    const isPwd = f.type === "password";
                    const reveal = !!showSecret[f.key];
                    return (
                      <div key={f.key}>
                        <FieldLabel required>{f.label}</FieldLabel>
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
                    {credsValid ? "Tryk 'Test forbindelse' for at tjekke at det virker." : "Udfyld alle felter for at fortsætte."}
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
                </>
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* TRIN 3 */}
      {step === 3 && (
        <SectionCard
          title="Sidste trin — vælg dine indstillinger"
          icon={<Settings2 />}
          description="Du kan altid ændre dem bagefter — de bruges som udgangspunkt når vi sender aftaler til dit regnskabsprogram."
        >
          <div className="divide-y divide-border">
            <div className="flex items-start justify-between gap-4 py-3 first:pt-0">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Send nye kundeforespørgsler som kladder</div>
                <p className="mt-0.5 text-xs text-muted-foreground">Slå til hvis forespørgsler skal oprettes som kladder. Slå fra hvis kun bekræftede aftaler skal sendes.</p>
              </div>
              <Switch checked={settings.push_pending !== false}
                onCheckedChange={v => setSettings({ ...settings, push_pending: v })} />
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Hold dine services opdateret som varer</div>
                <p className="mt-0.5 text-xs text-muted-foreground">Vi opretter dine services som varer i regnskabsprogrammet, så du ikke skal gøre det manuelt.</p>
              </div>
              <Switch checked={settings.auto_create_products !== false}
                onCheckedChange={v => setSettings({ ...settings, auto_create_products: v })} />
            </div>
            <div className="grid gap-4 py-3 sm:grid-cols-2 sm:gap-3 last:pb-0">
              <div>
                <FieldLabel required>Hvor mange dage må kunden om at betale?</FieldLabel>
                <Input type="number" min={0} value={settings.default_payment_terms_days ?? 14}
                  onChange={e => setSettings({ ...settings, default_payment_terms_days: Number(e.target.value) || 0 })} />
                <p className="mt-1.5 text-xs text-muted-foreground">14 dage er almindeligt i Danmark.</p>
              </div>
              <div>
                <FieldLabel required>Moms-sats i procent</FieldLabel>
                <Input type="number" min={0} max={100} value={settings.default_vat_rate ?? 25}
                  onChange={e => setSettings({ ...settings, default_vat_rate: Number(e.target.value) || 0 })} />
                <p className="mt-1.5 text-xs text-muted-foreground">25 % er almindelig moms i Danmark.</p>
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
            else {
              // Når brugeren går tilbage fra opsætningen til programvalg, skal alt
              // midlertidigt ryddes så næste program kan vælges med ét klik.
              setStep(1);
              resetWizardState(true);
            }
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {step === 1 ? "Tilbage til oversigt" : "Vælg et andet program"}
        </Button>

       {step < 3 ? (
         provider === "economic" || provider === "dinero" ? null :
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
            {saving ? "Forbinder…" : "Forbind nu"}
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
