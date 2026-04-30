import React, { useEffect, useMemo, useState } from "react";
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
  PageHeader, PrimaryButton, SectionCard, EmptyState, FieldLabel,
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
    description: "Forbind med en adgangsnøgle fra Billy — ingen adgangskoder gemmes.",
    helpUrl: "https://www.billy.dk/support/article/saadan-opretter-du-en-api-noegle-adgangsnoegle/",
    helpUrlLabel: "Se Billys guide til adgangsnøgler",
    fields: [
      { key: "api_token", label: "Adgangsnøgle fra Billy", type: "password",
        help: "Kopiér adgangsnøglen fra Billy under Indstillinger → Adgangsnøgler.", placeholder: "Indsæt adgangsnøglen fra Billy" },
    ],
    setupSteps: [
      "Tryk 'Åbn Billy' — vi sender dig direkte til siden med adgangsnøgler.",
      "Tryk 'Opret adgangsnøgle', kald den 'Serviceydere' og tryk Opret.",
      "Kopiér nøglen og kom tilbage hertil — vi tager os af resten automatisk.",
    ],
    note: {
      tone: "info",
      title: "Den mest stabile Billy-forbindelse",
      body: "Billy afviser ofte almindelig email/adgangskode via API'et, selv når adgangskoden er korrekt. En adgangsnøgle virker også med to-faktor-login og kan slettes igen inde i Billy.",
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
 * BillyConnectCard — guidet adgangsnøgle-flow.
 *
 * "Paste-and-go": brugeren paster sin adgangsnøgle, og vi kører automatisk
 * forbind → testdata → auto-opsætning → gem i ét. Ingen knapper at trykke.
 * Hvis noget fejler, viser vi hvad og hvordan i hverdagssprog.
 */
function BillyConnectCard({
  token,
  onTokenChange,
  onAutoConnect,
  status,
  errorMessage,
}: {
  token: string;
  onTokenChange: (value: string) => void;
  onAutoConnect: (token: string) => void;
  status: "idle" | "checking" | "testing" | "saving" | "done" | "error";
  errorMessage: string | null;
}) {
  const isWorking = status === "checking" || status === "testing" || status === "saving";
  const statusLabel =
    status === "checking" ? "Tjekker forbindelsen…" :
    status === "testing"  ? "Sender testdata til Billy…" :
    status === "saving"   ? "Sætter alt op for dig…" :
    null;

  // Paste handler: når nøglen indsættes, start auto-flow med det samme.
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").trim();
    if (!pasted) return;
    e.preventDefault();
    onTokenChange(pasted);
    // Lille delay så input visuelt opdateres før vi går i gang.
    setTimeout(() => onAutoConnect(pasted), 50);
  };

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
          <PartyPopper className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Du er forbundet med Billy!</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Vi har testet at synk virkelig virker, og sat alt op for dig. Dine kunder, services og aftaler synkroniseres nu automatisk.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stor primær handling: åbn Billy direkte på adgangsnøgle-siden */}
      <Button asChild size="lg" className="w-full h-14 text-base">
        <a
          href="https://mit.billy.dk/settings#/organization/access_tokens"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="mr-2 h-5 w-5" />
          Åbn Billy og opret adgangsnøgle
        </a>
      </Button>

      {/* Paste-area — fokus selv på siden */}
      <div>
        <Input
          autoFocus
          type="text"
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          onPaste={handlePaste}
          placeholder="Indsæt adgangsnøglen her — så går vi i gang"
          autoComplete="off"
          disabled={isWorking}
          className="h-14 text-center text-base"
        />
      </div>

      {/* Live-status mens vi arbejder */}
      {isWorking && statusLabel && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/30 py-3 text-sm font-medium text-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {statusLabel}
        </div>
      )}

      {/* Fejl: forklar i hverdagssprog + lad brugeren prøve igen */}
      {status === "error" && errorMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <div className="font-medium">Det virkede desværre ikke</div>
            <div className="mt-0.5 break-words opacity-90">{errorMessage}</div>
            <div className="mt-1.5 text-xs opacity-80">
              Tjek at du har kopieret hele nøglen. Du kan opret en ny i Billy hvis du er i tvivl.
            </div>
          </div>
        </div>
      )}

      {/* Hjælp — gemt bag toggle så det ikke roder skærmen */}
      <Collapsible>
        <CollapsibleTrigger className="group inline-flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <HelpCircle className="h-3.5 w-3.5" />
          Brug for hjælp til at finde adgangsnøglen?
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="grid gap-2 rounded-lg border border-border bg-card p-3 text-sm">
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">1</span>
              <span className="pt-0.5 text-muted-foreground">Tryk 'Åbn Billy' — du lander direkte på siden med adgangsnøgler.</span>
            </div>
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">2</span>
              <span className="pt-0.5 text-muted-foreground">Tryk 'Opret adgangsnøgle', kald den 'Serviceydere' og opret.</span>
            </div>
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">3</span>
              <span className="pt-0.5 text-muted-foreground">Kopiér nøglen og indsæt herover. Vi tager os af resten.</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/**
 * EconomicConnectCard — guidet OAuth-lignende flow for e-conomic.
 *
 * E-conomic kræver at brugeren godkender "Serviceydere"-app'en på sin
 * aftale via deres egen secure-portal. Når brugeren har godkendt,
 * sender e-conomic dem tilbage til /virksomhed?economicToken=XXX, hvor
 * vi opfanger tokenet og gemmer det krypteret. Brugeren ser aldrig
 * App Secret eller Agreement Grant Token.
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
    <div ref={ref} className="space-y-4">
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
            <Plug className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-foreground">Forbind e-conomic på 30 sekunder</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Du sendes til e-conomic, godkender Serviceydere-app'en på din aftale, og kommer tilbage hertil. Ingen tokens at kopiere — vi klarer det hele.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2 rounded-lg border border-border bg-card p-3 text-sm">
        <div className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">1</span>
          <span className="pt-0.5 text-muted-foreground">Tryk på den blå knap forneden — der åbner et nyt vindue med e-conomic.</span>
        </div>
        <div className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">2</span>
          <span className="pt-0.5 text-muted-foreground">Log ind i e-conomic og vælg den aftale, du vil forbinde Serviceydere med.</span>
        </div>
        <div className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">3</span>
          <span className="pt-0.5 text-muted-foreground">Tryk "Tildel adgang" — så sendes du tilbage hertil og er klar.</span>
        </div>
      </div>

      <Button onClick={onConnect} disabled={connecting} className="w-full">
        {connecting
          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          : <ExternalLink className="mr-2 h-4 w-4" />}
        {connecting ? "Forbinder…" : "Forbind e-conomic"}
      </Button>

      {waiting && !connectResult?.ok && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-sm text-foreground">
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          <div className="min-w-0">
            <div className="font-medium">Venter på godkendelse i e-conomic…</div>
            <div className="opacity-80 text-xs mt-0.5">Et nyt vindue er åbnet. Log ind, vælg din aftale og tryk "Tildel adgang" — så kommer du tilbage hertil automatisk.</div>
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
        Du kan altid tilbagekalde adgangen i e-conomic under Indstillinger → Integrationer → Apps.
      </p>
    </div>
  );
});
EconomicConnectCard.displayName = "EconomicConnectCard";

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
  // Billy paste-and-go: én samlet status fra "indsat" til "færdig opsat".
  const [billyStatus, setBillyStatus] = useState<
    "idle" | "checking" | "testing" | "saving" | "done" | "error"
  >("idle");
  const [billyError, setBillyError] = useState<string | null>(null);
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
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  // Auto-save status: vises diskret i sektion-headeren så brugeren altid
  // kan se om hans ændring er nået sikkert frem.
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const currentProvider = useMemo(
    () => PROVIDERS.find(p => p.value === provider)!,
    [provider],
  );

  const resetWizardState = (clearCredentials = true) => {
    if (clearCredentials) setCreds({});
    setShowSecret({});
    setTestResult(null);
    setDryRunResult(null);
    setBillyStatus("idle");
    setBillyError(null);
    setEconomicConnecting(false);
    setEconomicWaiting(false);
    setTesting(false);
    try { sessionStorage.removeItem("economic_pending_business_id"); } catch {}
  };

  const chooseProvider = (nextProvider: Provider) => {
    setProvider(nextProvider);
    resetWizardState(true);
    setStep(2);
    setMode("wizard");
  };

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

    // DLQ: jobs der har givet op efter 5 forsøg
    const { data: dlq } = await supabase.from("accounting_sync_dlq" as any)
      .select("*")
      .eq("business_id", businessId)
      .eq("resolved", false)
      .order("moved_to_dlq_at", { ascending: false })
      .limit(50);
    setDlqJobs((dlq as any) ?? []);

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
        if (!cancelled) await load();
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
   * Billy paste-and-go: når brugeren har indsat sin nøgle, kører vi automatisk
   *  1) testConnection
   *  2) dry-run (opret + slet testfaktura)
   *  3) hent grupper og auto-vælg første indtægtskonto
   *  4) gem integrationen og start første synk i baggrunden
   * Hvis vi ikke kan auto-vælge en konto, falder vi tilbage til wizard step 3.
   */
  const handleBillyAutoConnect = async (rawToken: string) => {
    const token = rawToken.trim();
    if (!token) return;
    setBillyError(null);

    // 1) Test forbindelse
    setBillyStatus("checking");
    try {
      const { data, error } = await supabase.functions.invoke("accounting-test-connection", {
        body: { business_id: businessId, provider: "billy", api_token: token, settings },
      });
      if (error) throw error;
      const r = data as { ok: boolean; message?: string };
      if (!r.ok) throw new Error(r.message ?? "Nøglen kunne ikke bruges");
    } catch (e: any) {
      setBillyError(e?.message ?? "Kunne ikke forbinde til Billy");
      setBillyStatus("error");
      return;
    }

    // 2) Dry-run: send rigtige testdata til Billy så vi ved synk virker
    setBillyStatus("testing");
    try {
      const { data, error } = await supabase.functions.invoke("accounting-dry-run", {
        body: { business_id: businessId, provider: "billy", api_token: token },
      });
      if (error) throw error;
      const r = data as { ok: boolean; steps?: { ok: boolean; label: string; message?: string }[] };
      if (!r.ok) {
        const failed = r.steps?.find(s => !s.ok);
        throw new Error(failed?.message ?? "Synk-testen kunne ikke gennemføres");
      }
    } catch (e: any) {
      setBillyError(e?.message ?? "Synk-testen fejlede");
      setBillyStatus("error");
      return;
    }

    // 3) Hent grupper og find en fornuftig indtægtskonto
    setBillyStatus("saving");
    let autoIncomeAccount: string | null = null;
    let foundGroups = false;
    try {
      // Gem først (uden konto) så accounting-list-groups kan finde integrationen
      const initialPayload = {
        business_id: businessId, provider: "billy", is_active: true,
        api_token: token, api_secret: null,
        agreement_number: null, organization_id: null,
        settings: { ...defaultSettings } as any,
        last_error: null, last_error_at: null,
      };
      const { error: saveErr } = await supabase.from("accounting_integrations" as any)
        .upsert(initialPayload, { onConflict: "business_id" });
      if (saveErr) throw saveErr;

      const { data: g } = await supabase.functions.invoke("accounting-list-groups", {
        body: { business_id: businessId },
      });
      const incomeAccounts = ((g as any)?.income_accounts ?? []) as { id: string }[];
      foundGroups = incomeAccounts.length > 0;
      if (foundGroups) autoIncomeAccount = incomeAccounts[0].id;
    } catch {
      // Ikke kritisk — falder tilbage til manuelt valg nedenfor
    }

    // 4) Hvis vi fandt en konto: gem den og afslut. Ellers: fald tilbage til step 3.
    if (autoIncomeAccount) {
      const finalSettings = { ...defaultSettings, default_income_account: autoIncomeAccount };
      try {
        await supabase.from("accounting_integrations" as any)
          .update({ settings: finalSettings as any })
          .eq("business_id", businessId);
        setSettings(finalSettings);
        setProvider("billy");
        setCreds({ api_token: token });
        setBillyStatus("done");
        toast.success("Billy er forbundet og klar!");
        // Stille første synk i baggrunden
        runFullSync(businessId).catch(() => { /* ignoreres */ });
        // Vent 1.2s så brugeren ser succes-skærmen, så ryk til oversigten
        setTimeout(async () => {
          await load();
          setMode("overview");
        }, 1400);
      } catch (e: any) {
        setBillyError(e?.message ?? "Kunne ikke gemme indstillinger");
        setBillyStatus("error");
      }
    } else {
      // Ingen konti i Billy endnu — bed brugeren vælge i step 3 (B-fallback)
      setProvider("billy");
      setCreds({ api_token: token });
      setSettings({ ...defaultSettings });
      setBillyStatus("idle");
      setStep(3);
      await load();
      toast.info("Næsten klar — vælg lige en indtægtskonto");
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
        { body: { action: "install_url" } },
      );
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
    await supabase.from("accounting_integrations" as any)
      .delete().eq("business_id", businessId);
    toast.success("Integration afbrudt");
    setIntegration(null);
    setCreds({});
    setSettings(defaultSettings);
    await load();
  };

  const handleSwitchProvider = () => {
    resetWizardState(true);
    setProvider("economic");
    setStep(1);
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
    if (r1.error) throw r1.error;
    const r2 = await supabase.functions.invoke("accounting-sync", { body: { business_id: bizId, mode: "pull" } });
    if (r2.error) throw r2.error;
    return {
      pushed: (r1.data as any)?.processed ?? 0,
      seeded: (r1.data as any)?.seeded ?? 0,
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
          description="Forbind dit regnskabsprogram, så dine kunder, services og aftaler automatisk holder sig opdateret begge steder. Du behøver ikke gøre noget — det sker af sig selv."
        />

        <EmptyState
          icon={<Calculator />}
          title="Vælg dit regnskabsprogram"
          description="Tryk på programmet du bruger. Det tager under 2 minutter — vi klarer resten."
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
              <div className="flex items-start gap-4">
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
                      ? `Alt kører automatisk. Næste opdatering kl. ${nextRunTxt} (${formatCountdown(nextRun)}).`
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
            </div>
          );
        })()}

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

        {/* Avancerede indstillinger — åbne som standard så brugeren kan se
            sine valg uden at skulle klikke. Kan klappes sammen hvis siden
            føles for lang. Tre underafsnit: synk-regler, placering, forbindelse. */}
        <Collapsible defaultOpen>
          <div className="rounded-2xl border border-border bg-card">
            <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">Avancerede indstillinger</div>
                  <div className="text-xs text-muted-foreground">Synk-regler, kontoplacering og frakobling — kun hvis du vil ændre noget.</div>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-6 border-t border-border p-4 sm:p-5">

        <SectionCard
          title="Hvordan sender vi dine aftaler?"
          icon={<Settings2 />}
          description="Ændringer gemmes automatisk."
          action={<AutoSaveBadge state={autoSaveState} />}
        >
          <div className="divide-y divide-border">
            <div className="flex items-start justify-between gap-4 py-3 first:pt-0">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Send tilbud du endnu ikke har sagt ja til</div>
                <p className="mt-0.5 text-xs text-muted-foreground">Når en kunde har sendt en forespørgsel — men du ikke har bekræftet endnu — sendes den også over som et udkast. Slå fra hvis du kun vil sende bekræftede aftaler.</p>
              </div>
              <Switch checked={settings.push_pending !== false}
                onCheckedChange={v => setSettings({ ...settings, push_pending: v })} />
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Opret dine ydelser automatisk som varer</div>
                <p className="mt-0.5 text-xs text-muted-foreground">Når du opretter en ny ydelse her, opretter vi den også som vare i dit regnskabsprogram. Så slipper du for at indtaste det samme to steder.</p>
              </div>
              <Switch checked={settings.auto_create_products !== false}
                onCheckedChange={v => setSettings({ ...settings, auto_create_products: v })} />
            </div>
            <div className="grid gap-4 py-3 sm:grid-cols-2 sm:gap-3 last:pb-0">
              <div>
                <FieldLabel>Hvor mange dage må kunden om at betale?</FieldLabel>
                <Input type="number" min={0} value={settings.default_payment_terms_days ?? 14}
                  onChange={e => setSettings({ ...settings, default_payment_terms_days: Number(e.target.value) || 0 })} />
                <p className="mt-1.5 text-xs text-muted-foreground">Bruges på nye fakturaer. 14 dage er standard i Danmark.</p>
              </div>
              <div>
                <FieldLabel>Moms-sats i procent</FieldLabel>
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
                <FieldLabel>
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
                <FieldLabel>
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
                <FieldLabel>
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

        {/* Skift program / Frakobl — hører hjemme under "avanceret" */}
        <SectionCard title="Forbindelse" icon={<Plug />}>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmSwitch(true)}
              className="h-9 rounded-lg text-xs font-medium"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Skift regnskabsprogram
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmDisable(true)}
              className="h-9 rounded-lg border-border text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
            >
              <X className="mr-1.5 h-4 w-4" /> Frakobl {activeDef.label}
            </Button>
          </div>
        </SectionCard>

              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Log */}
        {logs.length > 0 ? (
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
        )}

        {/* Bekræftelses-modaler */}
        <AlertDialog open={confirmDisable} onOpenChange={setConfirmDisable}>
          <AlertDialogContent className="rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Frakobl {activeDef.label}?
              </AlertDialogTitle>
              <AlertDialogDescription className="leading-relaxed">
                Vi stopper med at sende dine aftaler, kunder og services til {activeDef.label}.
                Det du allerede har sendt, bliver liggende i {activeDef.label} — der bliver ikke slettet noget.
                Du kan forbinde igen når som helst.
              </AlertDialogDescription>
            </AlertDialogHeader>
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

        <AlertDialog open={confirmSwitch} onOpenChange={setConfirmSwitch}>
          <AlertDialogContent className="rounded-xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-foreground" />
                Skift regnskabsprogram?
              </AlertDialogTitle>
              <AlertDialogDescription className="leading-relaxed">
                Du kan kun være forbundet med ét regnskabsprogram ad gangen. Når
                du vælger et nyt, stopper vi med at sende til {activeDef.label} —
                men intet slettes nogen af stederne.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="h-9 rounded-lg text-sm font-medium">
                Behold {activeDef.label}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { setConfirmSwitch(false); handleSwitchProvider(); }}
                className="h-9 rounded-lg text-sm font-medium bg-foreground text-background hover:bg-foreground/90"
              >
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
    { n: 2, label: "Log på", icon: ShieldCheck },
    { n: 3, label: "Indstillinger", icon: Settings2 },
  ] as const;

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

      {/* Stepper — kun for Dinero (manuel flerfelt-flow) */}
      {provider === "dinero" && (
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
      )}

      {/* TRIN 1 */}
      {step === 1 && (
        <SectionCard
          title="Hvilket regnskabsprogram bruger du?"
          icon={<Sparkles />}
          description="Du kan altid skifte program senere. Alt du har lavet i Serviceydere bliver liggende uanset hvad."
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
        <div className={
          provider === "billy" || provider === "economic"
            ? "grid gap-4 lg:grid-cols-[1fr,1.2fr] xl:grid-cols-[1fr,1.1fr]"
            : provider === "dinero"
              ? "grid gap-4 lg:grid-cols-[1fr,1.4fr]"
              : "mx-auto max-w-2xl"
        }>
          {/* Venstre kolonne: hjælp & forklaring (kun på desktop, ellers
              ovenfor connect-kortet på mobil) */}
          {(provider === "billy" || provider === "economic") && (
            <SectionCard
              title="Sådan fungerer det"
              icon={<img src={currentProvider.logo} alt="" className="h-4 w-auto" />}
              description={`Dette tager typisk under et minut.`}
              className="bg-secondary/30 lg:sticky lg:top-4 lg:self-start"
            >
              <ol className="space-y-3 text-sm">
                {(provider === "billy"
                  ? [
                      "Vi åbner Billy i et nyt vindue, direkte på siden med adgangsnøgler.",
                      "Du opretter en ny adgangsnøgle — det tager 5 sekunder i Billy.",
                      "Kopier nøglen, og indsæt den her i feltet — så går vi i gang automatisk.",
                      "Vi tester forbindelsen, opretter dine ydelser som varer, og er færdige.",
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
              <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs leading-relaxed text-foreground/80">
                <div className="mb-1 flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> Sikkert og krypteret
                </div>
                Vi gemmer kun det vi har brug for, og du kan altid tilbagekalde adgangen direkte i {currentProvider.label}.
              </div>
            </SectionCard>
          )}
          {provider === "dinero" && (
          <SectionCard
            title="Sådan finder du dine login-oplysninger"
            icon={<img src={currentProvider.logo} alt="" className="h-4 w-auto" />}
            description={`Følg disse trin inde i ${currentProvider.label} — så er du klar.`}
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
          )}

          <SectionCard
            title={
              provider === "billy" ? "Forbind Billy"
              : provider === "economic" ? "Forbind e-conomic"
              : "Indtast dine login-oplysninger"
            }
            icon={<ShieldCheck />}
            description={
              provider === "billy" ? "Brug en adgangsnøgle fra Billy — ikke din adgangskode."
              : provider === "economic" ? "Du sendes til e-conomic, godkender app'en, og kommer tilbage hertil. Ingen tokens at kopiere."
              : "Dine oplysninger gemmes sikkert og krypteret. De bruges kun til at sende og hente data fra dit regnskabsprogram."
            }
          >
            <div className="space-y-4">
              {provider === "billy" ? (
                <BillyConnectCard
                  token={creds.api_token ?? ""}
                  onTokenChange={(value) => {
                    setCreds({ ...creds, api_token: value });
                    if (billyStatus === "error") { setBillyStatus("idle"); setBillyError(null); }
                  }}
                  onAutoConnect={handleBillyAutoConnect}
                  status={billyStatus}
                  errorMessage={billyError}
                />
              ) : provider === "economic" ? (
                <EconomicConnectCard
                  onConnect={handleEconomicConnect}
                  connecting={economicConnecting}
                  waiting={economicWaiting}
                  connectResult={testResult}
                />
              ) : (
                <>
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
              )}
            </div>
          </SectionCard>
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
                <div className="text-sm font-medium text-foreground">Send aftaler der venter på svar</div>
                <p className="mt-0.5 text-xs text-muted-foreground">Slå til for at sende aftaler du endnu ikke har bekræftet. Slå fra for kun at sende dem du allerede har sagt ja til.</p>
              </div>
              <Switch checked={settings.push_pending !== false}
                onCheckedChange={v => setSettings({ ...settings, push_pending: v })} />
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Opret nye services automatisk i regnskabsprogrammet</div>
                <p className="mt-0.5 text-xs text-muted-foreground">Anbefales — så slipper du for at oprette dem to steder.</p>
              </div>
              <Switch checked={settings.auto_create_products !== false}
                onCheckedChange={v => setSettings({ ...settings, auto_create_products: v })} />
            </div>
            <div className="grid gap-4 py-3 sm:grid-cols-2 sm:gap-3 last:pb-0">
              <div>
                <FieldLabel>Hvor mange dage må kunden om at betale?</FieldLabel>
                <Input type="number" min={0} value={settings.default_payment_terms_days ?? 14}
                  onChange={e => setSettings({ ...settings, default_payment_terms_days: Number(e.target.value) || 0 })} />
                <p className="mt-1.5 text-xs text-muted-foreground">14 dage er almindeligt i Danmark.</p>
              </div>
              <div>
                <FieldLabel>Moms-sats i procent</FieldLabel>
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
              // Når brugeren går tilbage fra step 2 til programvalg skal vi
              // nulstille al provider-specifik state så de kan vælge frit
              // og klikke på et andet kort uden at det "bugger".
              setStep(1);
              setCreds({});
              setTestResult(null);
              setBillyStatus("idle");
              setBillyError(null);
              setEconomicConnecting(false);
              setEconomicWaiting(false);
            }
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {step === 1 ? "Tilbage til oversigt" : "Vælg et andet program"}
        </Button>

       {step < 3 ? (
         provider === "billy" || provider === "economic" ? null :
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
