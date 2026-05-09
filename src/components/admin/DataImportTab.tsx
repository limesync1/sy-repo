// DataImportTab — intelligent CSV-import til kunder, services/produkter og ordrer/aftaler.
// Hver entity-type har sin egen drop-zone, AI-mapping og preview.
import React, { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  UploadCloud, Loader2, FileText, Sparkles, CheckCircle2, AlertTriangle,
  Trash2, X, ArrowRight, Building2, User, HelpCircle, Mail, Users, Package, ClipboardList, FolderTree, Wand2, ChevronDown, ChevronRight, Check, ArrowLeft, Info, GitCompare, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionCard, EmptyState } from "@/components/admin/shared/AdminUI";
import { PageSkeleton } from "@/components/admin/shared/Skeletons";

type EntityType = "customers" | "services" | "orders";
type Row = Record<string, string>;
type Mapping = Record<string, string | undefined>;

const FIELD_DEFS: Record<EntityType, { key: string; label: string; required?: boolean }[]> = {
  customers: [
    { key: "type", label: "Kundetype (privat/erhverv)" },
    { key: "name", label: "Navn (privat)" },
    { key: "company_name", label: "Virksomhedsnavn" },
    { key: "cvr", label: "CVR-nummer" },
    { key: "contact_name", label: "Kontaktperson" },
    { key: "email", label: "E-mail" },
    { key: "phone", label: "Telefon" },
    { key: "address", label: "Adresse" },
    { key: "zip_code", label: "Postnummer" },
    { key: "city", label: "By" },
    { key: "customer_number", label: "Kundenummer" },
    { key: "ean_number", label: "EAN-nummer" },
    { key: "customer_group", label: "Kundegruppe" },
    { key: "currency", label: "Valuta (DKK, EUR…)" },
    { key: "vat_zone", label: "Momszone (DK, EU, eksport)" },
    { key: "payment_terms_days", label: "Betalingsfrist (dage)" },
    { key: "notes", label: "Noter" },
  ],
  services: [
    { key: "name", label: "Navn", required: true },
    { key: "description", label: "Beskrivelse" },
    { key: "base_price", label: "Pris" },
    { key: "currency", label: "Valuta (DKK, EUR…)" },
    { key: "unit", label: "Enhed (stk, time, m²)" },
    { key: "interval", label: "Interval (engangskøb, ugentligt, mdr.)" },
    { key: "product_number", label: "Varenummer" },
    { key: "service_category", label: "Kategori" },
    { key: "subcategory", label: "Underkategori" },
    { key: "default_vat_rate", label: "Momssats %" },
    { key: "accounting_account_number", label: "Bogføringskonto" },
  ],
  orders: [
    { key: "external_order_number", label: "Ordre-/fakturanr." },
    { key: "customer_email", label: "Kunde e-mail" },
    { key: "customer_name", label: "Kundenavn" },
    { key: "customer_phone", label: "Kunde telefon" },
    { key: "company_name", label: "Virksomhedsnavn" },
    { key: "cvr", label: "CVR" },
    { key: "customer_number", label: "Kundenummer" },
    { key: "ean_number", label: "EAN-nummer" },
    { key: "customer_group", label: "Kundegruppe" },
    { key: "address", label: "Adresse" },
    { key: "zip_code", label: "Postnummer" },
    { key: "city", label: "By" },
    { key: "service_name", label: "Produkt/service" },
    { key: "product_number", label: "Varenummer" },
    { key: "quantity", label: "Antal" },
    { key: "unit", label: "Enhed (stk, time, m²)" },
    { key: "interval", label: "Interval (engangskøb, ugentligt, mdr.)" },
    { key: "unit_price", label: "Stykpris" },
    { key: "total_amount", label: "Beløb i alt" },
    { key: "currency", label: "Valuta (DKK, EUR…)" },
    { key: "default_vat_rate", label: "Momssats %" },
    { key: "preferred_date", label: "Aftaledato" },
    { key: "status", label: "Status" },
    { key: "payment_terms_days", label: "Betalingsfrist (dage)" },
    { key: "notes", label: "Noter" },
  ],
};

const ENTITY_META: Record<EntityType, { label: string; icon: any; desc: string }> = {
  customers: { label: "Kunder", icon: Users, desc: "Privatkunder og erhvervskunder fra fx SkvizBiz, Fenster og lignende brancheprogrammer." },
  services: { label: "Produkter / services", icon: Package, desc: "Varekartotek, prislister og services." },
  orders: { label: "Ordrer / aftaler", icon: ClipboardList, desc: "Eksisterende ordrer, aftaler eller fakturaer." },
};

const get = (row: Row, mapping: Mapping, key: string): string | undefined => {
  const col = mapping[key];
  if (!col) return undefined;
  const v = row[col];
  return v === undefined || v === null ? undefined : String(v).trim() || undefined;
};

const cleanPhone = (s?: string) => s ? s.replace(/\s+/g, "").replace(/^\+45/, "") : undefined;
const parseDays = (s?: string) => { if (!s) return undefined; const m = String(s).match(/\d+/); return m ? Number(m[0]) : undefined; };
// Normalisér interval til et af de værdier vi bruger i resten af systemet.
const parseInterval = (s?: string): string | undefined => {
  if (!s) return undefined;
  const v = s.toLowerCase().trim();
  if (!v) return undefined;
  if (/(eng|once|engang|enkelt)/.test(v)) return "engangskøb";
  if (/(daglig|daily|hver.*dag)/.test(v)) return "daglig";
  if (/(uge|week|ugentlig)/.test(v)) return "ugentligt";
  if (/(14|hver.*anden.*uge|biweek|fortnight)/.test(v)) return "hver 14. dag";
  if (/(måned|maaned|month|mdr|md\.)/.test(v)) return "månedligt";
  if (/(kvartal|quarter|3.*måned)/.test(v)) return "kvartalsvis";
  if (/(halvår|halvaar|6.*måned|semi)/.test(v)) return "halvårligt";
  if (/(år|aar|year|annual)/.test(v)) return "årligt";
  return undefined; // ukendt → valideres som fejl
};
const VALID_INTERVALS = new Set(["engangskøb","daglig","ugentligt","hver 14. dag","månedligt","kvartalsvis","halvårligt","årligt"]);
const VALID_UNITS = new Set(["stk","time","m²","m³","km","dag","kg","liter","pakke","gang","besøg"]);
// Normalisér enheder.
const parseUnit = (s?: string): string | undefined => {
  if (!s) return undefined;
  const v = s.toLowerCase().trim();
  if (!v) return undefined;
  if (/(time|hour|t\.|hr)/.test(v)) return "time";
  if (/(m2|m²|kvm|kvadrat)/.test(v)) return "m²";
  if (/(m3|m³|kubik)/.test(v)) return "m³";
  if (/(stk|stk\.|pcs|piece|enhed)/.test(v)) return "stk";
  if (/(km|kilometer)/.test(v)) return "km";
  if (/(dag|day)/.test(v)) return "dag";
  if (/(kg|kilo)/.test(v)) return "kg";
  if (/(liter|ltr|l\.)/.test(v)) return "liter";
  if (/(pakke|pak|pkg)/.test(v)) return "pakke";
  if (/(besøg|visit)/.test(v)) return "besøg";
  if (/(gang)/.test(v)) return "gang";
  return undefined; // ukendt → valideres som fejl
};
const parseNum = (s?: string) => { if (!s) return undefined; const n = Number(String(s).replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, "")); return isFinite(n) ? n : undefined; };
const parseDate = (s?: string) => {
  if (!s) return undefined;
  const t = s.trim();
  // YYYY-MM-DD eller DD-MM-YYYY / DD/MM/YYYY
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${yyyy}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return undefined;
};

// Hvad gør en række til en erhvervskunde? Et CVR-nummer.
// Eksplicit type-kolonne (hvis den findes) trumfer alt; ellers: CVR ⇒ erhverv, intet CVR ⇒ privat.
const detectCustomerType = (row: Row, mapping: Mapping, fallback: "private" | "business"): "private" | "business" => {
  const explicit = get(row, mapping, "type");
  if (explicit) {
    const v = explicit.toLowerCase();
    if (["business", "erhverv", "virksomhed", "company", "b2b"].some((s) => v.includes(s))) return "business";
    if (["private", "privat", "person", "b2c"].some((s) => v.includes(s))) return "private";
  }
  // Trim cifre fra CVR — vi accepterer kun rigtige CVR-numre (mindst 6 cifre for at undgå støj).
  const cvr = (get(row, mapping, "cvr") || "").replace(/\D/g, "");
  if (cvr.length >= 6) return "business";
  return fallback;
};

// ---------- Mapping field-grupper (smartere layout) ----------
const FIELD_GROUPS: Record<EntityType, { title: string; keys: string[] }[]> = {
  customers: [
    { title: "Identitet", keys: ["type", "name", "company_name", "cvr", "contact_name", "customer_number", "ean_number", "customer_group"] },
    { title: "Kontakt", keys: ["email", "phone"] },
    { title: "Adresse", keys: ["address", "zip_code", "city"] },
    { title: "Fakturering", keys: ["currency", "vat_zone", "payment_terms_days"] },
    { title: "Andet", keys: ["notes"] },
  ],
  services: [
    { title: "Produkt", keys: ["name", "description", "product_number"] },
    { title: "Pris & enhed", keys: ["base_price", "currency", "unit", "interval", "default_vat_rate"] },
    { title: "Kategorisering", keys: ["service_category", "subcategory"] },
    { title: "Bogføring", keys: ["accounting_account_number"] },
  ],
  orders: [
    { title: "Ordre", keys: ["external_order_number", "preferred_date", "status", "payment_terms_days", "notes"] },
    { title: "Kunde", keys: ["customer_email", "customer_name", "customer_phone", "company_name", "cvr", "customer_number", "ean_number", "customer_group"] },
    { title: "Adresse", keys: ["address", "zip_code", "city"] },
    { title: "Linje", keys: ["service_name", "product_number", "quantity", "unit", "interval", "unit_price", "total_amount", "currency", "default_vat_rate"] },
  ],
};

// ---------- Per-entity import-panel ----------
// Detaljevisning af én række — viser alle felter inkl. uudfyldte mappede felter
// og rå CSV-kolonner som ikke blev mappet (så intet data går tabt).
const RowDetails = ({ row, entity, headers, mapping }: { row: any; entity: EntityType; headers: string[]; mapping: Mapping }) => {
  const fields = FIELD_DEFS[entity];
  const mappedCols = new Set(Object.values(mapping).filter(Boolean) as string[]);
  const unmapped = headers.filter((h) => !mappedCols.has(h)).filter((h) => {
    const v = row.source?.[h];
    return v !== undefined && v !== null && String(v).trim() !== "";
  });
  return (
    <div className="space-y-3">
      {row.errors.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-[11px] text-destructive">
          <p className="font-semibold">Validerings­fejl ({row.errors.length})</p>
          <ul className="ml-4 list-disc">{row.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}
      {row.isDuplicate && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-[11px] text-amber-700">
          <span className="font-semibold">Dublet:</span> {row.duplicateReason}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Mappede felter</p>
          <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1 text-[11px]">
            {fields.map((f) => {
              const v = (row as any)[f.key];
              const display = v == null || v === "" ? <span className="text-muted-foreground">—</span> : String(v);
              return (
                <React.Fragment key={f.key}>
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="font-medium text-foreground break-all">{display}</span>
                </React.Fragment>
              );
            })}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            Øvrige CSV-kolonner ({unmapped.length}) <span className="font-normal normal-case text-muted-foreground">— gemmes som noter ved import</span>
          </p>
          {unmapped.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Alle kolonner er mappet.</p>
          ) : (
            <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1 text-[11px]">
              {unmapped.map((h) => (
                <React.Fragment key={h}>
                  <span className="truncate text-muted-foreground" title={h}>{h}</span>
                  <span className="break-all text-foreground">{String(row.source[h])}</span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
      {entity === "orders" && (
        <div className="rounded-md border border-border bg-background p-2 text-[11px]">
          <p className="mb-1 font-semibold text-foreground">Aftale-/ordre­detaljer</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 md:grid-cols-3">
            <div><span className="text-muted-foreground">Ordrenr.:</span> <span className="text-foreground">{row.external_order_number || "—"}</span></div>
            <div><span className="text-muted-foreground">Service:</span> <span className="text-foreground">{row.service_name}</span></div>
            <div><span className="text-muted-foreground">Antal:</span> <span className="text-foreground">{row.quantity}{row.unit ? ` ${row.unit}` : ""}</span></div>
            <div><span className="text-muted-foreground">Stykpris:</span> <span className="text-foreground">{row.unit_price?.toLocaleString("da-DK")} kr</span></div>
            <div><span className="text-muted-foreground">Total:</span> <span className="text-foreground">{row.total_amount?.toLocaleString("da-DK")} kr</span></div>
            <div><span className="text-muted-foreground">Interval:</span> <span className="text-foreground">{row.interval || "engangskøb"}</span></div>
            <div><span className="text-muted-foreground">Dato:</span> <span className="text-foreground">{row.preferred_date || "—"}</span></div>
            <div><span className="text-muted-foreground">Status:</span> <span className="text-foreground">{row.status}</span></div>
            <div><span className="text-muted-foreground">Betalingsfrist:</span> <span className="text-foreground">{row.payment_terms_days != null ? `${row.payment_terms_days} dage` : "—"}</span></div>
          </div>
          {(row.customer_match_reason || row.service_match_reason) && (
            <div className="mt-2 space-y-0.5 border-t border-border pt-1.5">
              {row.customer_match_reason && <div><span className="text-muted-foreground">Kunde-match:</span> <span className="text-foreground">{row.customer_match_reason}</span></div>}
              {row.service_match_reason && <div><span className="text-muted-foreground">Service-match:</span> <span className="text-foreground">{row.service_match_reason}</span></div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------- Wizard step indicator ----------
const WIZARD_STEPS = ["Upload", "Tjek mapping", "Forhåndsvis", "Importér"];
const WizardSteps = ({ current }: { current: number }) => (
  <ol className="flex flex-wrap items-center gap-1.5 text-[11px]">
    {WIZARD_STEPS.map((label, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <li key={label} className="flex items-center gap-1.5">
          <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${done ? "bg-accent text-accent-foreground" : active ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
            {done ? <Check className="h-3 w-3" /> : i + 1}
          </span>
          <span className={`font-medium ${active ? "text-foreground" : done ? "text-foreground/70" : "text-muted-foreground"}`}>{label}</span>
          {i < WIZARD_STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/40" />}
        </li>
      );
    })}
  </ol>
);

const ImportPanel = ({
  entity, businessId, existingEmails, existingProductNumbers, existingExternalOrderNumbers, existingCategories, existingCustomers, existingServices,
  existingByEmail, existingByCvr, existingByCustomerNumber, existingByEan, existingByOrderNumber, existingByProductNumber, existingServiceNames,
  sharedFile, onFileChange,
}: {
  entity: EntityType;
  businessId: string;
  existingEmails: Set<string>;
  existingProductNumbers: Set<string>;
  existingExternalOrderNumbers: Set<string>;
  existingCategories: { category: string; subcategories: string[] }[];
  existingCustomers: { id: string; name: string; email: string; cvr?: string | null; phone?: string | null; zip_code?: string | null }[];
  existingServices: { id: string; name: string; product_number?: string | null; unit?: string | null; base_price?: number | null }[];
  existingByEmail: Record<string, string>;
  existingByCvr: Record<string, string>;
  existingByCustomerNumber: Record<string, string>;
  existingByEan: Record<string, string>;
  existingByOrderNumber: Record<string, string>;
  existingByProductNumber: Record<string, string>;
  existingServiceNames: Record<string, string>;
  sharedFile: File | null;
  onFileChange: (f: File | null) => void;
}) => {
  const fields = FIELD_DEFS[entity];
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [defaultType, setDefaultType] = useState<"private" | "business">("private");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNotes, setAiNotes] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  // Per-kolonne AI-analyse: hvad foreslår AI'en for hver CSV-kolonne, med
  // begrundelse + konfidens. Bruges til at vise badges + tooltips i mapping-
  // panelet og til at fremhæve usikre kolonner brugeren bør tjekke.
  const [columnAnalysis, setColumnAnalysis] = useState<Record<string, { suggested_field: string | null; confidence: number; reason: string }>>({});
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<{ created: number; skipped: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  // services: AI-klassificering pr. række index → resultat
  const [classifications, setClassifications] = useState<Record<number, { service_category?: string; subcategory?: string; is_new_category?: boolean; is_new_subcategory?: boolean; confidence?: number }>>({});
  const [classifying, setClassifying] = useState(false);
  // orders: AI-match pr. række index
  const [orderMatches, setOrderMatches] = useState<Record<number, { customer_id?: string | null; customer_match_reason?: string; customer_confidence?: number; service_id?: string | null; service_match_reason?: string; service_confidence?: number; inferred_unit_price?: number | null }>>({});
  const [matching, setMatching] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autoSwitchedRef = useRef(false);

  // Hvis parenten leverer en allerede uploadet fil (fx fordi auto-detect skiftede
  // entitetstype efter upload), så indlæs den automatisk i denne panel.
  useEffect(() => {
    if (sharedFile && sharedFile !== file) {
      handleFile(sharedFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedFile]);

  // Auto-detektion af hvilket indhold filen har (kunder/services/aftaler/blanding).
  const [detection, setDetection] = useState<{
    contains: { customers?: boolean; services?: boolean; orders?: boolean };
    primary: EntityType;
    is_mixed: boolean;
    confidence?: number;
    summary?: string;
    recommendations: EntityType[];
  } | null>(null);

  // Paginering — vis ALLE rækker, men 50 ad gangen så browseren ikke fryser.
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  // Filter: vis kun fejl, dubletter eller alle
  const [rowFilter, setRowFilter] = useState<"all" | "ok" | "dup" | "err">("all");
  // Rækker brugeren manuelt har fravalgt (index i prepared). Som standard er
  // alle gyldige rækker valgt (= ikke i settet).
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  // Rækker med fejl/dubletter brugeren manuelt vil tvinge med (selvom de ellers
  // ikke ville blive importeret). Pt. bruger vi det ikke, men holder muligheden åben.
  const [forceInclude, setForceInclude] = useState<Set<number>>(new Set());
  // Hvilke rækker er udfoldet (vis alle CSV-felter + aftaledetaljer)
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggleExpand = (i: number) => setExpanded((p) => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const reset = () => {
    setFile(null); setRows([]); setHeaders([]); setMapping({});
    setAiNotes(null); setConfidence(null); setDone(null);
    setColumnAnalysis({});
    setClassifications({});
    setOrderMatches({});
    setDetection(null);
    setPage(0); setRowFilter("all");
    setExcluded(new Set()); setForceInclude(new Set());
    if (inputRef.current) inputRef.current.value = "";
    onFileChange(null);
  };

  const handleFile = async (f: File) => {
    if (!f.name.toLowerCase().endsWith(".csv")) {
      toast.error("Vælg en CSV-fil (.csv)");
      return;
    }
    setFile(f); setDone(null);
    onFileChange(f);
    // Reset selektion når en ny fil læses ind
    setExcluded(new Set()); setForceInclude(new Set());

    // Læs filen som bytes så vi selv kan håndtere encoding. SkvizBiz og en
    // del andre danske eksport-værktøjer gemmer som Windows-1252/ISO-8859-1,
    // hvilket ellers giver "�" i stedet for æøå.
    let text = "";
    try {
      const buf = await f.arrayBuffer();
      const bytes = new Uint8Array(buf);
      // Prøv UTF-8 strikt først
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch {
        // Fald tilbage til Windows-1252 (dækker også ISO-8859-1)
        text = new TextDecoder("windows-1252").decode(bytes);
      }
      // Fjern eventuel BOM
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    } catch (e: any) {
      toast.error("Kunne ikke læse fil: " + (e?.message || "ukendt fejl"));
      return;
    }

    Papa.parse<Row>(text, {
      header: true, skipEmptyLines: true, dynamicTyping: false,
      // Auto-detekter delimiter — SkvizBiz/Fenster bruger ofte ';', andre ','
      delimiter: "",
      complete: async (result) => {
        const parsed = (result.data || []).filter((r) => r && Object.values(r).some((v) => v));
        if (parsed.length === 0) { toast.error("CSV-filen er tom"); return; }
        const hdrs = result.meta.fields || Object.keys(parsed[0] || {});
        setHeaders(hdrs); setRows(parsed);
        // Kør detektion + mapping parallelt
        await Promise.all([
          detectContent(hdrs, parsed.slice(0, 5)),
          runAi(hdrs, parsed.slice(0, 5)),
        ]);
      },
      error: (err: any) => toast.error("Kunne ikke læse CSV: " + err.message),
    });
  };

  const detectContent = async (hdrs: string[], sample: Row[]) => {
    try {
      const { data, error } = await supabase.functions.invoke("import-customers-ai", {
        body: { mode: "detect", headers: hdrs, sample },
      });
      if (error) throw error;
      const det = {
        contains: data?.contains || {},
        primary: (data?.primary || "customers") as EntityType,
        is_mixed: !!data?.is_mixed,
        confidence: typeof data?.confidence === "number" ? data.confidence : undefined,
        summary: data?.summary || undefined,
        recommendations: (Array.isArray(data?.recommendations) ? data.recommendations : [data?.primary || "customers"]) as EntityType[],
      };
      setDetection(det);
      // Auto-skift til den primære entitet hvis vi er på en anden fane (kun én gang pr. fil).
      if (det.primary && det.primary !== entity && !autoSwitchedRef.current) {
        autoSwitchedRef.current = true;
        window.dispatchEvent(new CustomEvent("dataimport:switch-entity", { detail: det.primary }));
      }
    } catch {
      // stille fejl — manuelt skift muligt
    }
  };

  const runAi = async (hdrs: string[], sample: Row[]) => {
    setAiLoading(true); setAiNotes(null);
    try {
      const { data, error } = await supabase.functions.invoke("import-customers-ai", {
        body: { headers: hdrs, sample, defaultType, entityType: entity },
      });
      if (error) throw error;
      const m: Mapping = {};
      const raw = (data?.mapping || {}) as Record<string, string | null>;
      for (const f of fields) {
        const v = raw[f.key];
        if (v && hdrs.includes(v)) m[f.key] = v;
      }
      setMapping(m);
      if (entity === "customers" && (data?.default_type === "business" || data?.default_type === "private")) {
        setDefaultType(data.default_type);
      }
      setConfidence(typeof data?.confidence === "number" ? data.confidence : null);
      setAiNotes(data?.notes || null);
      // Per-kolonne analyse fra AI'en — bruges til badges/tooltip i mapping-panelet.
      const analysisArr: any[] = Array.isArray(data?.column_analysis) ? data.column_analysis : [];
      const analysisMap: Record<string, { suggested_field: string | null; confidence: number; reason: string }> = {};
      analysisArr.forEach((a: any) => {
        if (a && typeof a.column === "string" && hdrs.includes(a.column)) {
          analysisMap[a.column] = {
            suggested_field: a.suggested_field || null,
            confidence: typeof a.confidence === "number" ? a.confidence : 0,
            reason: typeof a.reason === "string" ? a.reason : "",
          };
        }
      });
      setColumnAnalysis(analysisMap);
    } catch {
      toast.error("AI-analyse fejlede — vælg felterne manuelt");
    } finally { setAiLoading(false); }
  };

  // Klassificér produkter ind i virksomhedens kategorier (kun services-entity).
  const classifyServices = async (currentMapping: Mapping, currentRows: Row[]) => {
    if (entity !== "services" || currentRows.length === 0) return;
    setClassifying(true);
    try {
      const items = currentRows.slice(0, 200).map((r) => ({
        name: get(r, currentMapping, "name") || "",
        description: get(r, currentMapping, "description") || "",
        raw_category: get(r, currentMapping, "service_category") || "",
        raw_subcategory: get(r, currentMapping, "subcategory") || "",
        product_number: get(r, currentMapping, "product_number") || "",
        unit: get(r, currentMapping, "unit") || "",
      }));
      const { data, error } = await supabase.functions.invoke("import-customers-ai", {
        body: { mode: "classify_services", items, existing: existingCategories },
      });
      if (error) throw error;
      const arr: any[] = data?.classifications || [];
      const map: Record<number, any> = {};
      arr.forEach((c, i) => { if (c) map[i] = c; });
      setClassifications(map);
    } catch {
      // stille fejl — manuelt udfyld muligt
    } finally { setClassifying(false); }
  };

  // Når mapping ændrer sig for services, kør klassificering automatisk
  useEffect(() => {
    if (entity === "services" && rows.length > 0 && Object.keys(mapping).length > 0 && !aiLoading) {
      classifyServices(mapping, rows);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapping.name, mapping.description, mapping.service_category, mapping.subcategory, rows.length]);

  // Match ordrer mod eksisterende kunder + services
  const matchOrders = async (currentMapping: Mapping, currentRows: Row[]) => {
    if (entity !== "orders" || currentRows.length === 0) return;
    setMatching(true);
    try {
      const items = currentRows.slice(0, 200).map((r) => ({
        customer_email: get(r, currentMapping, "customer_email") || "",
        customer_name: get(r, currentMapping, "customer_name") || "",
        company_name: get(r, currentMapping, "company_name") || "",
        cvr: get(r, currentMapping, "cvr") || "",
        phone: get(r, currentMapping, "customer_phone") || "",
        zip_code: get(r, currentMapping, "zip_code") || "",
        service_name: get(r, currentMapping, "service_name") || "",
        product_number: get(r, currentMapping, "product_number") || "",
        unit: get(r, currentMapping, "unit") || "",
        unit_price: get(r, currentMapping, "unit_price") || "",
      }));
      const lightCustomers = existingCustomers.slice(0, 800).map((c) => ({
        id: c.id, name: c.name, email: c.email, cvr: c.cvr || null, phone: c.phone || null, zip_code: c.zip_code || null,
      }));
      const lightServices = existingServices.slice(0, 400).map((s) => ({
        id: s.id, name: s.name, product_number: s.product_number || null, unit: s.unit || null, base_price: s.base_price ?? null,
      }));
      const { data, error } = await supabase.functions.invoke("import-customers-ai", {
        body: { mode: "match_orders", items, customers: lightCustomers, services: lightServices },
      });
      if (error) throw error;
      const arr: any[] = data?.matches || [];
      const map: Record<number, any> = {};
      arr.forEach((m, i) => { if (m) map[i] = m; });
      setOrderMatches(map);
    } catch {
      // stille fejl
    } finally { setMatching(false); }
  };

  useEffect(() => {
    if (entity === "orders" && rows.length > 0 && Object.keys(mapping).length > 0 && !aiLoading) {
      matchOrders(mapping, rows);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapping.customer_email, mapping.customer_name, mapping.company_name, mapping.cvr, mapping.service_name, mapping.product_number, rows.length]);

  // ---------- prepared rækker afhængigt af entity ----------
  const prepared = useMemo(() => {
    const seenEmails = new Set<string>();
    const seenProductNumbers = new Set<string>();
    const seenOrderNumbers = new Set<string>();
    return rows.map((row) => {
      const errors: string[] = [];
      let isDuplicate = false; let duplicateReason: string | undefined;

      if (entity === "customers") {
        const type = detectCustomerType(row, mapping, defaultType);
        const email = (get(row, mapping, "email") || "").toLowerCase();
        // E-mail og telefon er valgfri — vi tillader oprettelse uden.
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Ugyldig e-mail");
        const hasName = !!get(row, mapping, "name");
        const hasCompany = !!get(row, mapping, "company_name");
        if (type === "private" && !hasName && !hasCompany) errors.push("Mangler navn eller virksomhedsnavn");
        if (type === "business" && !hasCompany && !hasName) errors.push("Mangler virksomhedsnavn eller navn");
        // Smart dublet-detektion: tjek e-mail, CVR, kundenummer og EAN.
        const cvrKey = (get(row, mapping, "cvr") || "").replace(/\D/g, "");
        const custNum = (get(row, mapping, "customer_number") || "").toLowerCase();
        const eanKey = (get(row, mapping, "ean_number") || "").replace(/\D/g, "");
        const dupHits: string[] = [];
        if (email && existingByEmail[email]) dupHits.push(`e-mail (${email}) → "${existingByEmail[email]}"`);
        if (cvrKey && existingByCvr[cvrKey]) dupHits.push(`CVR (${cvrKey}) → "${existingByCvr[cvrKey]}"`);
        if (custNum && existingByCustomerNumber[custNum]) dupHits.push(`kundenr. (${custNum}) → "${existingByCustomerNumber[custNum]}"`);
        if (eanKey && existingByEan[eanKey]) dupHits.push(`EAN (${eanKey}) → "${existingByEan[eanKey]}"`);
        if (dupHits.length) {
          isDuplicate = true;
          duplicateReason = `Findes allerede i jeres kartotek — matchet på ${dupHits.join(" og ")}.`;
        } else if (email && seenEmails.has(email)) {
          isDuplicate = true;
          duplicateReason = `E-mailen "${email}" optræder flere gange i denne CSV-fil — kun første række importeres.`;
        }
        if (email) seenEmails.add(email);
        return {
          source: row, kind: "customer" as const, type, email,
          name: get(row, mapping, "name"),
          company_name: get(row, mapping, "company_name"),
          cvr: get(row, mapping, "cvr")?.replace(/\D/g, "") || undefined,
          contact_name: get(row, mapping, "contact_name"),
          phone: cleanPhone(get(row, mapping, "phone")),
          address: get(row, mapping, "address"),
          zip_code: get(row, mapping, "zip_code"),
          city: get(row, mapping, "city"),
          customer_number: get(row, mapping, "customer_number"),
          ean_number: get(row, mapping, "ean_number"),
          customer_group: get(row, mapping, "customer_group"),
          currency: get(row, mapping, "currency")?.toUpperCase(),
          vat_zone: get(row, mapping, "vat_zone"),
          payment_terms_days: parseDays(get(row, mapping, "payment_terms_days")),
          notes: get(row, mapping, "notes"),
          errors, isDuplicate, duplicateReason,
        };
      }

      if (entity === "services") {
        const name = get(row, mapping, "name");
        const product_number = get(row, mapping, "product_number");
        if (!name) errors.push("Mangler navn");
        const dupKey = product_number?.toLowerCase();
        const nameKey = name?.toLowerCase();
        const dupHits: string[] = [];
        if (dupKey && existingByProductNumber[dupKey]) dupHits.push(`varenr. (${product_number}) → "${existingByProductNumber[dupKey]}"`);
        if (nameKey && existingServiceNames[nameKey]) dupHits.push(`navn ("${existingServiceNames[nameKey]}")`);
        if (dupHits.length) {
          isDuplicate = true;
          duplicateReason = `Findes allerede i jeres katalog — matchet på ${dupHits.join(" og ")}.`;
        } else if (dupKey && seenProductNumbers.has(dupKey)) {
          isDuplicate = true;
          duplicateReason = `Varenummer "${product_number}" optræder flere gange i CSV-filen — kun første række importeres.`;
        }
        if (dupKey) seenProductNumbers.add(dupKey);
        const idx = rows.indexOf(row);
        const ai = classifications[idx];
        const rawCat = get(row, mapping, "service_category");
        const rawSub = get(row, mapping, "subcategory");
        const final_category = rawCat || ai?.service_category || undefined;
        const final_subcategory = rawSub || ai?.subcategory || undefined;
        const rawUnit = get(row, mapping, "unit");
        const rawInterval = get(row, mapping, "interval");
        const unit = parseUnit(rawUnit);
        const interval = parseInterval(rawInterval);
        if (rawUnit && !unit) errors.push(`Ukendt enhed "${rawUnit}" — brug fx stk, time, m², m³, km, dag, kg, liter`);
        if (rawInterval && !interval) errors.push(`Ukendt interval "${rawInterval}" — brug fx engangskøb, ugentligt, hver 14. dag, månedligt, kvartalsvis, halvårligt, årligt`);
        const basePrice = parseNum(get(row, mapping, "base_price"));
        if (basePrice == null && rawUnit) errors.push("Mangler pris (kræves når enhed er angivet)");
        if (interval && interval !== "engangskøb" && !unit) errors.push("Mangler enhed (kræves når der er et tilbagevendende interval)");
        return {
          source: row, kind: "service" as const,
          name: name || "",
          description: get(row, mapping, "description"),
          base_price: basePrice,
          currency: get(row, mapping, "currency")?.toUpperCase(),
          unit,
          interval,
          raw_unit: rawUnit,
          raw_interval: rawInterval,
          product_number,
          service_category: final_category,
          subcategory: final_subcategory,
          ai_category: ai?.service_category,
          ai_subcategory: ai?.subcategory,
          ai_is_new_category: ai?.is_new_category,
          ai_is_new_subcategory: ai?.is_new_subcategory,
          ai_confidence: ai?.confidence,
          default_vat_rate: parseNum(get(row, mapping, "default_vat_rate")),
          accounting_account_number: get(row, mapping, "accounting_account_number"),
          errors, isDuplicate, duplicateReason,
        };
      }

      // orders
      const customer_email = (get(row, mapping, "customer_email") || "").toLowerCase();
      const ext = get(row, mapping, "external_order_number");
      const idxOrd = rows.indexOf(row);
      const match = orderMatches[idxOrd];
      const cName = get(row, mapping, "customer_name") || get(row, mapping, "company_name");
      // Vi accepterer ordrer uden e-mail så længe vi kan identificere kunden på navn/firma/CVR/match.
      if (customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) errors.push("Ugyldig kunde e-mail");
      if (!customer_email && !match?.customer_id && !cName && !get(row, mapping, "cvr")) {
        errors.push("Mangler kundeoplysning (navn, e-mail eller CVR)");
      }
      const dupKey = ext?.toLowerCase();
      if (dupKey && existingByOrderNumber[dupKey]) {
        isDuplicate = true;
        duplicateReason = `Findes allerede — matchet på ordre-/fakturanr. (${ext}) tilhørende "${existingByOrderNumber[dupKey]}".`;
      } else if (dupKey && seenOrderNumbers.has(dupKey)) {
        isDuplicate = true;
        duplicateReason = `Ordrenr. "${ext}" optræder flere gange i denne CSV-fil — kun første række importeres.`;
      }
      if (dupKey) seenOrderNumbers.add(dupKey);

      const qty = parseNum(get(row, mapping, "quantity")) ?? 1;
      const rawUnitPrice = parseNum(get(row, mapping, "unit_price"));
      const unit_price = rawUnitPrice ?? (match?.inferred_unit_price ?? undefined);
      const total_amount = parseNum(get(row, mapping, "total_amount")) ?? (unit_price ? unit_price * qty : 0);
      const matchedCustomer = match?.customer_id ? existingCustomers.find((c) => c.id === match.customer_id) : undefined;
      const matchedService = match?.service_id ? existingServices.find((s) => s.id === match.service_id) : undefined;
      const rawUnitO = get(row, mapping, "unit");
      const rawIntervalO = get(row, mapping, "interval");
      const unitO = parseUnit(rawUnitO) || matchedService?.unit || undefined;
      const intervalO = parseInterval(rawIntervalO);
      if (rawUnitO && !parseUnit(rawUnitO)) errors.push(`Ukendt enhed "${rawUnitO}" — brug fx stk, time, m², m³, km, dag, kg, liter`);
      if (rawIntervalO && !intervalO) errors.push(`Ukendt interval "${rawIntervalO}" — brug fx engangskøb, ugentligt, månedligt, årligt`);
      if (intervalO && intervalO !== "engangskøb" && !unitO) errors.push("Mangler enhed på aftalelinjen (kræves ved tilbagevendende interval)");
      if (qty > 1 && !unitO) errors.push("Mangler enhed (når antal > 1, skal enhed angives)");
      return {
        source: row, kind: "order" as const,
        external_order_number: ext,
        customer_email: customer_email || matchedCustomer?.email || "",
        customer_name: get(row, mapping, "customer_name") || get(row, mapping, "company_name") || matchedCustomer?.name || "Ukendt",
        customer_phone: cleanPhone(get(row, mapping, "customer_phone")),
        company_name: get(row, mapping, "company_name"),
        cvr: get(row, mapping, "cvr")?.replace(/\D/g, "") || undefined,
        customer_number: get(row, mapping, "customer_number"),
        ean_number: get(row, mapping, "ean_number"),
        customer_group: get(row, mapping, "customer_group"),
        address: get(row, mapping, "address"),
        zip_code: get(row, mapping, "zip_code"),
        city: get(row, mapping, "city"),
        service_name: get(row, mapping, "service_name") || "Importeret ordrelinje",
        product_number: get(row, mapping, "product_number"),
        quantity: qty,
        unit: unitO,
        interval: intervalO,
        raw_unit: rawUnitO,
        raw_interval: rawIntervalO,
        unit_price: unit_price ?? total_amount / Math.max(qty, 1),
        total_amount,
        currency: get(row, mapping, "currency")?.toUpperCase(),
        default_vat_rate: parseNum(get(row, mapping, "default_vat_rate")),
        preferred_date: parseDate(get(row, mapping, "preferred_date")),
        status: (get(row, mapping, "status") || "completed").toLowerCase(),
        payment_terms_days: parseDays(get(row, mapping, "payment_terms_days")),
        notes: get(row, mapping, "notes"),
        matched_customer_id: match?.customer_id || null,
        matched_customer_name: matchedCustomer?.name,
        customer_match_reason: match?.customer_match_reason,
        customer_confidence: match?.customer_confidence,
        matched_service_id: match?.service_id || null,
        matched_service_name: matchedService?.name,
        service_match_reason: match?.service_match_reason,
        service_confidence: match?.service_confidence,
        errors, isDuplicate, duplicateReason,
      };
    });
  }, [rows, mapping, defaultType, entity, existingEmails, existingProductNumbers, existingExternalOrderNumbers, classifications, orderMatches, existingCustomers, existingServices, existingByEmail, existingByCvr, existingByCustomerNumber, existingByEan, existingByOrderNumber, existingByProductNumber, existingServiceNames]);

  // Hvilke rækker er valgt til import? Default = alle uden fejl/dublet (minus
  // dem brugeren manuelt har fravalgt) plus dem brugeren har tvunget med.
  const isSelected = (idx: number, r: any) => {
    if (excluded.has(idx)) return false;
    if (forceInclude.has(idx)) return true;
    return r.errors.length === 0 && !r.isDuplicate;
  };

  const stats = useMemo(() => ({
    total: prepared.length,
    ok: prepared.filter((r) => r.errors.length === 0 && !r.isDuplicate).length,
    duplicates: prepared.filter((r) => r.isDuplicate).length,
    errors: prepared.filter((r) => r.errors.length > 0).length,
    selected: prepared.filter((r, i) => isSelected(i, r)).length,
  }), [prepared, excluded, forceInclude]);

  // Filtrér rækker til tabellen + nulstil side når filter ændres.
  const filteredRows = useMemo(() => {
    if (rowFilter === "ok") return prepared.filter((r) => r.errors.length === 0 && !r.isDuplicate);
    if (rowFilter === "dup") return prepared.filter((r) => r.isDuplicate);
    if (rowFilter === "err") return prepared.filter((r) => r.errors.length > 0);
    return prepared;
  }, [prepared, rowFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visibleRows = filteredRows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  useEffect(() => { setPage(0); }, [rowFilter, prepared.length]);

  const runImport = async () => {
    const valid = prepared.filter((r, i) => isSelected(i, r));
    if (valid.length === 0) { toast.error("Ingen rækker valgt til import"); return; }
    // Stop hvis nogen valgt række har valideringsfejl — vi vil ikke importere
    // ufuldstændige interval-/enhedsdata.
    const withErrors = valid.filter((r: any) => r.errors.length > 0);
    if (withErrors.length > 0) {
      toast.error(`${withErrors.length} valgte rækker har fejl — ret dem eller fravælg dem først`);
      return;
    }
    const mappedCols = new Set(Object.values(mapping).filter(Boolean) as string[]);
    const buildExtraNotes = (src: Row): string => {
      const extras = headers
        .filter((h) => !mappedCols.has(h))
        .map((h) => [h, src?.[h]])
        .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
        .map(([h, v]) => `${h}: ${String(v).trim()}`);
      return extras.length ? extras.join("\n") : "";
    };
    const mergeNotes = (n: string | null | undefined, extra: string) => {
      if (!extra) return n || null;
      return n ? `${n}\n\n— Importeret ekstra felter —\n${extra}` : `— Importeret ekstra felter —\n${extra}`;
    };
    setImporting(true);
    try {
      let created = 0;
      const chunk = <T,>(arr: T[], size: number): T[][] => { const o: T[][] = []; for (let i = 0; i < arr.length; i += size) o.push(arr.slice(i, i + size)); return o; };

      if (entity === "customers") {
        const biz = (valid as any[]).filter((r) => r.type === "business").map((r) => ({
          business_id: businessId, company_name: r.company_name || r.name || "",
          cvr: r.cvr || null, contact_name: r.contact_name || null, email: r.email,
          phone: r.phone || null, address: r.address || null, zip_code: r.zip_code || null, city: r.city || null,
          notes: mergeNotes(r.notes, buildExtraNotes(r.source)), customer_number: r.customer_number || null,
          ean_number: r.ean_number || null, payment_terms_days: r.payment_terms_days ?? null,
          customer_group: r.customer_group || null,
          currency: r.currency || null,
          vat_zone: r.vat_zone || null,
        }));
        const priv = (valid as any[]).filter((r) => r.type === "private").map((r) => ({
          business_id: businessId, name: r.name || r.company_name || "Ukendt", email: r.email,
          phone: r.phone || null, address: r.address || null, zip_code: r.zip_code || null, city: r.city || null,
          notes: mergeNotes(r.notes, buildExtraNotes(r.source)), customer_number: r.customer_number || null,
          ean_number: r.ean_number || null, payment_terms_days: r.payment_terms_days ?? null,
          customer_group: r.customer_group || null,
          currency: r.currency || null,
          vat_zone: r.vat_zone || null,
        }));
        for (const part of chunk(biz, 100)) {
          const { data, error } = await supabase.from("business_customers").upsert(part as any, { onConflict: "business_id,email", ignoreDuplicates: true }).select("id");
          if (error) throw error; created += data?.length || 0;
        }
        for (const part of chunk(priv, 100)) {
          const { data, error } = await supabase.from("private_customers").upsert(part as any, { onConflict: "business_id,email", ignoreDuplicates: true }).select("id");
          if (error) throw error; created += data?.length || 0;
        }
      } else if (entity === "services") {
        const services = (valid as any[]).map((r) => ({
          business_id: businessId, name: r.name,
          description: (() => {
            const extra = buildExtraNotes(r.source);
            return r.description ? (extra ? `${r.description}\n\n— Ekstra felter —\n${extra}` : r.description) : (extra || null);
          })(),
          base_price: r.base_price ?? null,
          unit: r.unit || null,
          interval_options: r.interval ? [r.interval] : ["engangskøb"],
          product_number: r.product_number || null,
          service_category: r.service_category || null,
          subcategory: r.subcategory || null,
          default_vat_rate: r.default_vat_rate ?? 25,
          accounting_account_number: r.accounting_account_number || null,
          pricing_type: "fast_pris" as const,
          is_active: true,
        }));
        for (const part of chunk(services, 100)) {
          const { data, error } = await supabase.from("services").insert(part as any).select("id");
          if (error) throw error; created += data?.length || 0;
        }
      } else {
        // orders — opret order + 1 line per række. Hvis en ordre refererer til en
        // service der ikke findes endnu, opretter vi den automatisk så ordren
        // ikke står med en tom linje. Inden vi opretter dem, lader vi AI'en
        // klassificere de nye service-navne på baggrund af eksisterende
        // kategorier — så de lander det rigtige sted i kataloget.
        const serviceCache = new Map<string, string>(); // navn (lowercase) → id
        existingServices.forEach((s) => { if (s.name) serviceCache.set(s.name.toLowerCase(), s.id); });
        // Find unikke service-navne der mangler at blive oprettet
        const missingNames = Array.from(new Set(
          (valid as any[])
            .filter((r) => !r.matched_service_id && r.service_name)
            .map((r) => String(r.service_name).trim())
            .filter((n) => n && !serviceCache.has(n.toLowerCase()))
        ));
        const aiCategoryByName = new Map<string, { service_category?: string; subcategory?: string }>();
        if (missingNames.length > 0) {
          try {
            const items = missingNames.map((n) => ({ name: n, description: "", raw_category: "", raw_subcategory: "", product_number: "", unit: "" }));
            const { data: aiData } = await supabase.functions.invoke("import-customers-ai", {
              body: { mode: "classify_services", items, existing: existingCategories },
            });
            const arr: any[] = aiData?.classifications || [];
            arr.forEach((c, i) => {
              if (c) aiCategoryByName.set(missingNames[i].toLowerCase(), { service_category: c.service_category, subcategory: c.subcategory });
            });
          } catch { /* stille fejl — opretter uden kategori */ }
        }
        for (const r of valid as any[]) {
          // Find / opret service hvis nødvendigt
          let serviceId: string | null = r.matched_service_id || null;
          if (!serviceId && r.service_name) {
            const key = String(r.service_name).toLowerCase().trim();
            if (serviceCache.has(key)) serviceId = serviceCache.get(key)!;
            else {
              const cat = aiCategoryByName.get(key);
              const { data: newSvc, error: svcErr } = await supabase
                .from("services")
                .insert({
                  business_id: businessId,
                  name: r.service_name,
                  base_price: r.unit_price ?? null,
                  unit: r.unit || "stk",
                  interval_options: r.interval ? [r.interval] : ["engangskøb"],
                  pricing_type: "fast_pris" as const,
                  default_vat_rate: 25,
                  is_active: true,
                  service_category: cat?.service_category || null,
                  subcategory: cat?.subcategory || null,
                } as any)
                .select("id")
                .single();
              if (!svcErr && newSvc) { serviceId = newSvc.id; serviceCache.set(key, newSvc.id); }
            }
          }
          const { data: orderRow, error: orderErr } = await supabase.from("orders").insert({
            business_id: businessId,
            customer_id: r.matched_customer_id || null,
            customer_name: r.customer_name,
            customer_email: r.customer_email || null,
            customer_phone: r.customer_phone || null,
            company_name: r.company_name || null,
            cvr: r.cvr || null,
            address: r.address || null,
            zip_code: r.zip_code || null,
            city: r.city || null,
            total_amount: r.total_amount,
            status: ["pending", "confirmed", "completed", "cancelled"].includes(r.status) ? r.status : "completed",
            external_order_number: r.external_order_number || null,
            preferred_date: r.preferred_date || null,
            payment_terms_days: r.payment_terms_days ?? null,
            notes: mergeNotes(r.notes, buildExtraNotes(r.source)),
          } as any).select("id").single();
          if (orderErr) throw orderErr;
          const { error: itemErr } = await supabase.from("order_items").insert({
            order_id: orderRow.id,
            service_id: serviceId,
            service_name: r.service_name,
            quantity: r.quantity,
            unit_price: r.unit_price,
            total_price: r.total_amount,
            details: { unit: r.unit || null, interval: r.interval || null },
          } as any);
          if (itemErr) throw itemErr;
          // Berig kunden (oprettet/matchet via trigger eller match) med ekstra
          // felter fra ordre-rækken — kundenummer, kundegruppe, EAN, valuta osv.
          // Vi opdaterer både private_customers og business_customers; kun den
          // matchende e-mail/CVR opdateres faktisk.
          const enrich: Record<string, any> = {};
          if (r.customer_number) enrich.customer_number = r.customer_number;
          if (r.ean_number) enrich.ean_number = r.ean_number;
          if (r.customer_group) enrich.customer_group = r.customer_group;
          if (r.currency) enrich.currency = r.currency;
          if (r.payment_terms_days != null) enrich.payment_terms_days = r.payment_terms_days;
          if (r.phone) enrich.phone = r.phone;
          if (r.address) enrich.address = r.address;
          if (r.zip_code) enrich.zip_code = r.zip_code;
          if (r.city) enrich.city = r.city;
          if (Object.keys(enrich).length > 0 && r.customer_email) {
            const isBiz = !!(r.cvr || r.company_name);
            const table = isBiz ? "business_customers" : "private_customers";
            await supabase.from(table as any)
              .update(enrich)
              .eq("business_id", businessId)
              .ilike("email", r.customer_email);
          }
          created += 1;
        }
      }

      setDone({ created, skipped: valid.length - created + (prepared.length - valid.length) });
      toast.success(`Importerede ${created} ${entity === "customers" ? "kunder" : entity === "services" ? "produkter" : "ordrer"}`);
    } catch (e: any) {
      toast.error("Import fejlede: " + (e?.message || "ukendt"));
    } finally { setImporting(false); }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    const f = e.dataTransfer.files?.[0]; if (f) handleFile(f);
  };

  const meta = ENTITY_META[entity];
  const Icon = meta.icon;

  // Smarte stats: privat vs erhverv (skal stå før evt. early return for at hooks-rækkefølgen er stabil).
  const customerSplit = useMemo(() => {
    if (entity !== "customers") return null;
    let priv = 0, biz = 0;
    prepared.forEach((r: any) => { if (r.type === "business") biz++; else priv++; });
    return { priv, biz };
  }, [prepared, entity]);

  if (!file) {
    return (
      <div className="space-y-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`group relative flex flex-col items-center justify-center gap-5 overflow-hidden rounded-3xl border-2 border-dashed px-6 py-16 text-center cursor-pointer sm:py-20 ${dragActive ? "border-accent bg-accent/5" : "border-border bg-secondary/20"}`}
        >
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-foreground text-background shadow-sm">
            <UploadCloud className="h-7 w-7" />
          </div>
          <div className="max-w-md space-y-2">
            <p className="text-lg font-semibold text-foreground">Træk din CSV-fil hertil</p>
            <p className="text-sm text-muted-foreground">
              Eller <span className="font-medium text-foreground underline underline-offset-2">klik for at vælge</span> en fil fra din computer.
            </p>
            <p className="text-xs text-muted-foreground">
              Vi finder selv ud af om det er <span className="font-medium text-foreground">kunder</span>, <span className="font-medium text-foreground">produkter</span> eller <span className="font-medium text-foreground">aftaler</span>.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            <Badge variant="secondary" className="text-[10.5px]"><Sparkles className="mr-1 h-2.5 w-2.5" /> Auto-detektion</Badge>
            <Badge variant="secondary" className="text-[10.5px]"><Wand2 className="mr-1 h-2.5 w-2.5" /> AI-mapping</Badge>
            <Badge variant="secondary" className="text-[10.5px]">Op til 10.000 rækker</Badge>
          </div>
        </div>
      </div>
    );
  }

  const fileSizeKb = file ? Math.round(file.size / 1024) : 0;
  const mappedCount = Object.values(mapping).filter(Boolean).length;
  const totalFields = fields.length;
  const requiredMissing = fields.filter((f) => f.required && !mapping[f.key]).length;

  return (
    <div className="space-y-5">
      {/* ─── Wizard steps ─── */}
      <WizardSteps current={done ? 3 : (Object.keys(mapping).length === 0 ? 1 : (rows.length > 0 ? 2 : 1))} />

      {/* ─── Hero topbar — alt vigtigt på ét sted ─── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-secondary/40 via-background to-background">
        <div className="flex flex-wrap items-start gap-4 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {rows.length.toLocaleString("da-DK")} rækker · {headers.length} kolonner · {fileSizeKb} KB
            </p>
            {detection && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge className="bg-accent/15 text-accent hover:bg-accent/20 text-[10.5px]">
                  <Sparkles className="mr-1 h-2.5 w-2.5" />
                  {detection.is_mixed
                    ? "Blandet indhold"
                    : `${detection.primary === "customers" ? "Kunder" : detection.primary === "services" ? "Produkter" : "Aftaler"} fundet`}
                  {typeof detection.confidence === "number" && <span className="ml-1 opacity-60">{detection.confidence}%</span>}
                </Badge>
                {detection.is_mixed && detection.recommendations.map((r) => r !== entity && (
                  <button key={r}
                    onClick={() => window.dispatchEvent(new CustomEvent("dataimport:switch-entity", { detail: r }))}
                    className="inline-flex items-center gap-1.5 rounded-full border border-accent bg-accent text-accent-foreground px-3 py-1 text-xs font-semibold shadow-sm hover:brightness-95 transition">
                    <ArrowRight className="h-3 w-3" /> Importér også som {r === "customers" ? "kunder" : r === "services" ? "produkter" : "aftaler"}
                  </button>
                ))}
                {!detection.is_mixed && detection.primary !== entity && (
                  <button onClick={() => window.dispatchEvent(new CustomEvent("dataimport:switch-entity", { detail: detection.primary }))}
                    className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/5 px-2 py-0.5 text-[10.5px] font-medium text-accent hover:bg-accent/10">
                    Skift til {detection.primary === "customers" ? "kunder" : detection.primary === "services" ? "produkter" : "aftaler"} →
                  </button>
                )}
              </div>
            )}
            {aiNotes && <p className="mt-2 text-xs italic text-muted-foreground">"{aiNotes}"</p>}
          </div>
          <div className="flex items-center gap-2">
            {aiLoading ? (
              <Badge variant="secondary" className="text-[10.5px]"><Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" /> Analyserer…</Badge>
            ) : confidence !== null && (
              <Badge variant="secondary" className="text-[10.5px]"><CheckCircle2 className="mr-1 h-2.5 w-2.5 text-accent" /> Mapping {confidence}%</Badge>
            )}
            <Button variant="ghost" size="sm" onClick={reset} className="h-7 px-2 text-muted-foreground hover:text-destructive">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* AI status-bar nederst i hero */}
        {(entity === "services" || entity === "orders" || (entity === "customers" && customerSplit)) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-background/60 px-4 py-2 text-[11px]">
            {entity === "customers" && customerSplit && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="h-3 w-3 text-foreground" /> <span className="font-semibold text-foreground">{customerSplit.biz}</span> erhverv (med CVR)
                <span className="mx-1 text-border">·</span>
                <User className="h-3 w-3 text-foreground" /> <span className="font-semibold text-foreground">{customerSplit.priv}</span> privat (uden CVR)
              </span>
            )}
            {entity === "services" && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <FolderTree className="h-3 w-3 text-foreground" />
                {classifying ? <><Loader2 className="h-3 w-3 animate-spin" /> Klassificerer…</> : (
                  <>AI matcher mod jeres <span className="font-semibold text-foreground">{existingCategories.length}</span> kategorier · <span className="font-semibold text-foreground">{Object.keys(classifications).length}</span> klassificeret</>
                )}
              </span>
            )}
            {entity === "orders" && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Wand2 className="h-3 w-3 text-foreground" />
                {matching ? <><Loader2 className="h-3 w-3 animate-spin" /> Matcher…</> : (
                  <>Matchet <span className="font-semibold text-foreground">{Object.values(orderMatches).filter((m: any) => m.customer_id).length}</span> kunder · <span className="font-semibold text-foreground">{Object.values(orderMatches).filter((m: any) => m.service_id).length}</span> services</>
                )}
              </span>
            )}
            <span className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground">
              <Wand2 className="h-3 w-3" /> {mappedCount}/{totalFields} felter mappet
              {requiredMissing > 0 && <span className="ml-1 text-destructive">· {requiredMissing} påkrævet mangler</span>}
            </span>
          </div>
        )}
      </div>

      {/* ─── Statistik-kort (klikbare filtre) ─── 
          Tre status-knapper + en "Alle" toggle — totalen vises i hero, så det
          slipper at fylde et helt kort her. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          { label: "Klar til import", value: stats.ok, tone: "ok", filter: "ok" as const, icon: CheckCircle2 },
          { label: "Dubletter", value: stats.duplicates, tone: "warn", filter: "dup" as const, icon: AlertTriangle },
          { label: "Fejl", value: stats.errors, tone: stats.errors > 0 ? "err" : "neutral", filter: "err" as const, icon: AlertTriangle },
        ].map((s) => {
          const SI = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => setRowFilter(s.filter)}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all ${rowFilter === s.filter ? "border-foreground bg-foreground/5 shadow-sm" : "border-border bg-background hover:bg-secondary/40"}`}
            >
              <div>
                <p className="text-[10.5px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className={`text-xl font-bold ${s.tone === "ok" ? "text-foreground" : s.tone === "warn" ? "text-amber-600" : s.tone === "err" ? "text-destructive" : "text-foreground"}`}>{s.value.toLocaleString("da-DK")}</p>
              </div>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.tone === "ok" ? "bg-secondary text-foreground" : s.tone === "warn" ? "bg-amber-500/10 text-amber-600" : s.tone === "err" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                <SI className="h-4 w-4" />
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── Felt-mapping (grupperet i kolonner) ─── 
          Bruger en styled details så vi får samme ramme/typografi som de
          øvrige kort i admin-panelet (i stedet for browserens default). */}
      <details open className="group rounded-xl border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-foreground select-none [&::-webkit-details-marker]:hidden">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-foreground">
            <Wand2 className="h-3.5 w-3.5" />
          </span>
          <span>Felt-mapping</span>
          <span className="text-xs font-normal text-muted-foreground">· {mappedCount}/{totalFields} mappet</span>
          {requiredMissing > 0 && (
            <Badge variant="destructive" className="text-[10px]">{requiredMissing} påkrævet mangler</Badge>
          )}
          <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-border p-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {FIELD_GROUPS[entity].map((group) => (
              <div key={group.title} className="space-y-1.5">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</p>
                {group.keys.map((k) => {
                  const f = fields.find((x) => x.key === k);
                  if (!f) return null;
                  const mapped = !!mapping[f.key];
                  // Find AI-analyse for den kolonne der er valgt (eller foreslået).
                  const mappedCol = mapping[f.key];
                  const analysis = mappedCol ? columnAnalysis[mappedCol] : undefined;
                  // Hvis AI'en har en alternativ-foreslået kolonne for dette felt
                  // (men brugeren har valgt noget andet eller intet), find den.
                  const aiSuggestedCol = !mappedCol
                    ? Object.entries(columnAnalysis).find(([, a]) => a.suggested_field === f.key && a.confidence >= 50)?.[0]
                    : undefined;
                  const aiSuggestion = aiSuggestedCol ? columnAnalysis[aiSuggestedCol] : undefined;
                  const conf = analysis?.confidence ?? aiSuggestion?.confidence;
                  const reason = analysis?.reason || aiSuggestion?.reason || "";
                  const lowConfidence = mapped && typeof conf === "number" && conf < 60;
                  const tone =
                    typeof conf !== "number" ? null :
                    conf >= 80 ? "high" :
                    conf >= 60 ? "med" : "low";
                  return (
                    <div key={f.key} className={`flex flex-col gap-1.5 rounded-md border px-2.5 py-2 transition-colors sm:flex-row sm:items-center sm:gap-2 ${
                      lowConfidence
                        ? "border-amber-500/50 bg-amber-500/5"
                        : mapped
                        ? "border-accent/30 bg-accent/5"
                        : "border-border bg-secondary/20"
                    }`}>
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${mapped ? "bg-accent" : f.required ? "bg-destructive" : "bg-muted-foreground/30"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground">
                            {f.label}{f.required && <span className="ml-0.5 text-destructive">*</span>}
                          </p>
                          {(reason || aiSuggestion) && (
                            <p
                              className={`mt-0.5 truncate text-[10px] leading-tight ${
                                tone === "high" ? "text-foreground/60"
                                : tone === "med" ? "text-amber-700"
                                : tone === "low" ? "text-amber-700 font-medium"
                                : "text-muted-foreground"
                              }`}
                              title={reason || `AI foreslår "${aiSuggestedCol}"`}
                            >
                              {aiSuggestion && !mapped
                                ? <>✨ AI foreslår "{aiSuggestedCol}" {typeof aiSuggestion.confidence === "number" ? `(${aiSuggestion.confidence}%)` : ""}</>
                                : <>{tone === "low" ? "⚠ AI er usikker · " : ""}{reason}</>}
                            </p>
                          )}
                        </div>
                      </div>
                      {mapped && typeof conf === "number" && (
                        <span
                          className={`hidden shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold sm:inline-block ${
                            tone === "high" ? "bg-accent/15 text-accent"
                            : tone === "med" ? "bg-amber-500/15 text-amber-700"
                            : "bg-amber-500/25 text-amber-800"
                          }`}
                          title={reason}
                        >
                          {conf}%
                        </span>
                      )}
                      {!mapped && aiSuggestion && (
                        <button
                          type="button"
                          onClick={() => setMapping((prev) => ({ ...prev, [f.key]: aiSuggestedCol }))}
                          className="hidden shrink-0 rounded-md border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent hover:bg-accent/20 sm:inline-block"
                          title={`Brug AI's forslag: ${aiSuggestedCol}`}
                        >
                          Brug forslag
                        </button>
                      )}
                      <Select value={mapping[f.key] || "__none__"} onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === "__none__" ? undefined : v }))}>
                        <SelectTrigger className="h-8 w-full text-xs sm:w-[150px]"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs">— Ingen —</SelectItem>
                          {headers.map((h) => {
                            const a = columnAnalysis[h];
                            const suffix = a && typeof a.confidence === "number" ? ` · ${a.confidence}%` : "";
                            return <SelectItem key={h} value={h} className="text-xs">{h}{suffix}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {entity === "customers" && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs">
              <span className="text-muted-foreground">Privat eller erhverv?</span>
              <Badge variant="secondary" className="text-[10.5px]">CVR udfyldt → erhverv · ellers privat</Badge>
              <span className="ml-auto text-muted-foreground">Standard når ikke entydigt:</span>
              <div className="inline-flex rounded-md border border-border bg-background p-0.5">
                {(["private", "business"] as const).map((t) => (
                  <button key={t} onClick={() => setDefaultType(t)}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded ${defaultType === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                    {t === "private" ? "Privat" : "Erhverv"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </details>

      {/* ─── Preview-tabel ─── */}
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/30 px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Forhåndsvisning</span>
            {rowFilter !== "all" && (
              <Badge variant="outline" className="text-[10px]">
                Filter: {rowFilter === "ok" ? "Klar" : rowFilter === "dup" ? "Dubletter" : "Fejl"}
                <button onClick={() => setRowFilter("all")} className="ml-1 hover:text-destructive">
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            )}
          </div>
          <span className="text-muted-foreground">
            {filteredRows.length === 0 ? 0 : safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filteredRows.length)} af {filteredRows.length.toLocaleString("da-DK")}
          </span>
        </div>
        <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-xs">
          <thead className="bg-secondary/60">
            <tr className="text-left">
              <th className="px-2 py-1.5 font-medium w-8">
                <Checkbox
                  checked={visibleRows.length > 0 && visibleRows.every((r: any) => isSelected(prepared.indexOf(r), r))}
                  onCheckedChange={(v) => {
                    setExcluded((prev) => {
                      const n = new Set(prev);
                      const fi = new Set(forceInclude);
                      visibleRows.forEach((r: any) => {
                        const i = prepared.indexOf(r);
                        if (v) {
                          n.delete(i);
                          if (r.errors.length > 0 || r.isDuplicate) fi.add(i);
                        } else {
                          n.add(i);
                          fi.delete(i);
                        }
                      });
                      setForceInclude(fi);
                      return n;
                    });
                  }}
                />
              </th>
              <th className="px-1 py-1.5 font-medium w-6"></th>
              <th className="px-2 py-1.5 font-medium">Status</th>
              {entity === "customers" && <>
                <th className="px-2 py-1.5 font-medium">Type</th>
                <th className="px-2 py-1.5 font-medium">Navn / virksomhed</th>
                <th className="px-2 py-1.5 font-medium">E-mail</th>
                <th className="px-2 py-1.5 font-medium">Telefon</th>
                <th className="px-2 py-1.5 font-medium">By</th>
              </>}
              {entity === "services" && <>
                <th className="px-2 py-1.5 font-medium">Navn</th>
                <th className="px-2 py-1.5 font-medium">Pris</th>
                <th className="px-2 py-1.5 font-medium">Enhed</th>
                <th className="px-2 py-1.5 font-medium">Interval</th>
                <th className="px-2 py-1.5 font-medium">Varenr.</th>
                <th className="px-2 py-1.5 font-medium">Kategori → Underkategori</th>
              </>}
              {entity === "orders" && <>
                <th className="px-2 py-1.5 font-medium">Ordrenr.</th>
                <th className="px-2 py-1.5 font-medium">Kunde</th>
                <th className="px-2 py-1.5 font-medium">Linje</th>
                <th className="px-2 py-1.5 font-medium">Enhed / interval</th>
                <th className="px-2 py-1.5 font-medium">Beløb</th>
                <th className="px-2 py-1.5 font-medium">Dato</th>
              </>}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((r: any, i) => {
              const realIdx = prepared.indexOf(r);
              const sel = isSelected(realIdx, r);
              const isOpen = expanded.has(realIdx);
              return (
              <React.Fragment key={safePage * PAGE_SIZE + i}>
              <tr className={`border-t border-border hover:bg-secondary/30 ${!sel ? "opacity-50" : ""}`}>
                <td className="px-2 py-1.5">
                  <Checkbox
                    checked={sel}
                    onCheckedChange={(v) => {
                      if (v) {
                        setExcluded((p) => { const n = new Set(p); n.delete(realIdx); return n; });
                        if (r.errors.length > 0 || r.isDuplicate) setForceInclude((p) => new Set(p).add(realIdx));
                      } else {
                        setForceInclude((p) => { const n = new Set(p); n.delete(realIdx); return n; });
                        setExcluded((p) => new Set(p).add(realIdx));
                      }
                    }}
                  />
                </td>
                <td className="px-1 py-1.5">
                  <button onClick={() => toggleExpand(realIdx)} className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Vis alle detaljer">
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                </td>
                <td className="px-2 py-1.5">
                  {r.errors.length > 0 ? (
                    <Badge variant="destructive" className="text-[10px]" title={r.errors.join(" · ")}>
                      Fejl: {r.errors.join(", ")}
                    </Badge>
                  ) : r.isDuplicate ? (
                    <Badge variant="secondary" className="text-[10px] max-w-[280px] truncate" title={r.duplicateReason}>
                      Dublet — {r.duplicateReason}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-foreground/20 bg-secondary text-foreground text-[10px]">Klar</Badge>
                  )}
                </td>
                {entity === "customers" && <>
                  <td className="px-2 py-1.5">{r.type === "business"
                    ? <span className="inline-flex items-center gap-1 text-foreground"><Building2 className="h-3 w-3" /> Erhverv</span>
                    : <span className="inline-flex items-center gap-1 text-foreground"><User className="h-3 w-3" /> Privat</span>}</td>
                  <td className="px-2 py-1.5 text-foreground">
                    <div className="flex flex-col gap-0.5">
                      <span>{r.company_name || r.name || "—"}</span>
                      {(() => {
                        // Hvis filen er blandet (kunde + aftale på samme række), vis aftalelinje
                        const svc = r.source?.[mapping["service_name" as any] || ""] || r.source?.["Opgavebeskrivelse"] || r.source?.["Opgave"] || r.source?.["Service"];
                        const interval = r.source?.["Faktureringsinterval"] || r.source?.["Interval"] || r.source?.["Frekvens"];
                        const price = r.source?.["Pris"] || r.source?.["Pris ekskl. moms"] || r.source?.["Pris per enhed"];
                        if (!svc && !interval && !price) return null;
                        return (
                          <Badge variant="outline" className="w-fit text-[10px]" title={`${svc || ""} · ${interval || ""} · ${price || ""}`}>
                            <ClipboardList className="mr-1 h-2.5 w-2.5" /> Aftale: {String(svc || "ydelse").slice(0, 30)}{interval ? ` (${interval})` : ""}
                          </Badge>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground">{r.email || "—"}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{r.phone || "—"}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{r.city || "—"}</td>
                </>}
                {entity === "services" && <>
                  <td className="px-2 py-1.5 text-foreground">{r.name || "—"}</td>
                  <td className="px-2 py-1.5 text-foreground">{r.base_price != null ? r.base_price.toLocaleString("da-DK") + " kr" : "—"}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{r.unit || "—"}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{r.interval || "engangskøb"}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{r.product_number || "—"}</td>
                  <td className="px-2 py-1.5">
                    {r.service_category ? (
                      <span className="inline-flex flex-wrap items-center gap-1">
                        <Badge variant={r.ai_is_new_category ? "outline" : "secondary"} className="text-[10px]">
                          {r.ai_is_new_category && <Sparkles className="mr-1 h-2.5 w-2.5" />}
                          {r.service_category}
                        </Badge>
                        {r.subcategory && (
                          <>
                            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                            <Badge variant={r.ai_is_new_subcategory ? "outline" : "secondary"} className="text-[10px]">
                              {r.ai_is_new_subcategory && <Sparkles className="mr-1 h-2.5 w-2.5" />}
                              {r.subcategory}
                            </Badge>
                          </>
                        )}
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                </>}
                {entity === "orders" && <>
                  <td className="px-2 py-1.5 text-foreground">{r.external_order_number || "—"}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-foreground">{r.customer_name} <span className="text-[10px] text-muted-foreground">({r.customer_email || "—"})</span></span>
                      {r.matched_customer_id ? (
                        <Badge className="w-fit bg-accent/15 text-accent hover:bg-accent/20 text-[10px]" title={r.customer_match_reason}>
                          <CheckCircle2 className="mr-1 h-2.5 w-2.5" /> Eksisterende kunde{typeof r.customer_confidence === "number" ? ` · ${r.customer_confidence}%` : ""}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="w-fit text-[10px]"><Sparkles className="mr-1 h-2.5 w-2.5" /> Ny kunde</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-foreground">{r.service_name} × {r.quantity}{r.unit ? ` ${r.unit}` : ""}</span>
                      {r.matched_service_id ? (
                        <Badge className="w-fit bg-accent/15 text-accent hover:bg-accent/20 text-[10px]" title={r.service_match_reason}>
                          <CheckCircle2 className="mr-1 h-2.5 w-2.5" /> {r.matched_service_name || "Eksisterende"}{typeof r.service_confidence === "number" ? ` · ${r.service_confidence}%` : ""}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="w-fit text-[10px]"><Sparkles className="mr-1 h-2.5 w-2.5" /> Service oprettes automatisk</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    <div className="flex flex-col gap-0.5">
                      <span>{r.quantity}{r.unit ? ` ${r.unit}` : " stk"}</span>
                      <span className="text-[10px]">{r.interval || "engangskøb"}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-foreground">{r.total_amount?.toLocaleString("da-DK")} kr</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{r.preferred_date || "—"}</td>
                </>}
              </tr>
              {isOpen && (
                <tr className="bg-secondary/20">
                  <td colSpan={20} className="px-4 py-3">
                    <RowDetails row={r} entity={entity} headers={headers} mapping={mapping} />
                  </td>
                </tr>
              )}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
        </div>
        {/* Mobile card-list view */}
        <div className="divide-y divide-border md:hidden">
          {visibleRows.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">Ingen rækker.</div>
          )}
          {visibleRows.map((r: any, i) => {
            const realIdx = prepared.indexOf(r);
            const sel = isSelected(realIdx, r);
            const isOpen = expanded.has(realIdx);
            const title =
              entity === "customers"
                ? (r.company_name || r.name || "—")
                : entity === "services"
                ? (r.name || "—")
                : `${r.customer_name || "—"} · ${r.service_name || ""}`;
            const sub =
              entity === "customers"
                ? [r.email, r.phone, r.city].filter(Boolean).join(" · ")
                : entity === "services"
                ? [r.base_price != null ? `${r.base_price.toLocaleString("da-DK")} kr` : null, r.unit, r.interval || "engangskøb"].filter(Boolean).join(" · ")
                : [r.external_order_number, r.preferred_date, r.total_amount != null ? `${r.total_amount.toLocaleString("da-DK")} kr` : null].filter(Boolean).join(" · ");
            return (
              <div key={`m-${safePage * PAGE_SIZE + i}`} className={`px-3 py-3 ${!sel ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-2">
                  <Checkbox
                    className="mt-0.5"
                    checked={sel}
                    onCheckedChange={(v) => {
                      if (v) {
                        setExcluded((p) => { const n = new Set(p); n.delete(realIdx); return n; });
                        if (r.errors.length > 0 || r.isDuplicate) setForceInclude((p) => new Set(p).add(realIdx));
                      } else {
                        setForceInclude((p) => { const n = new Set(p); n.delete(realIdx); return n; });
                        setExcluded((p) => new Set(p).add(realIdx));
                      }
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{title}</p>
                    {sub && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {r.errors.length > 0 ? (
                        <Badge variant="destructive" className="text-[10px]">Fejl: {r.errors.join(", ")}</Badge>
                      ) : r.isDuplicate ? (
                        <Badge variant="secondary" className="text-[10px]">Dublet</Badge>
                      ) : (
                        <Badge variant="outline" className="border-foreground/20 bg-secondary text-foreground text-[10px]">Klar</Badge>
                      )}
                      {entity === "customers" && (
                        <Badge variant="outline" className="text-[10px]">{r.type === "business" ? "Erhverv" : "Privat"}</Badge>
                      )}
                    </div>
                  </div>
                  <button onClick={() => toggleExpand(realIdx)} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-3 rounded-md bg-secondary/30 p-3">
                    <RowDetails row={r} entity={entity} headers={headers} mapping={mapping} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {pageCount > 1 && (
          <div className="flex items-center justify-between gap-2 border-t border-border bg-secondary/20 px-3 py-2 text-[11px] text-muted-foreground">
            <span>Side <span className="font-semibold text-foreground">{safePage + 1}</span> af {pageCount}</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setPage(0)} disabled={safePage === 0}>«</Button>
              <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}>‹ Forrige</Button>
              <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1}>Næste ›</Button>
              <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setPage(pageCount - 1)} disabled={safePage >= pageCount - 1}>»</Button>
            </div>
          </div>
        )}
      </div>

      {done ? (
        <div className="flex items-center gap-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-accent" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Import gennemført</p>
            <p className="text-xs text-muted-foreground">{done.created} oprettet</p>
          </div>
          <Button variant="outline" size="sm" onClick={reset}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Ny import</Button>
        </div>
      ) : (
        <div className="sticky bottom-0 -mx-4 mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-4">
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{stats.selected.toLocaleString("da-DK")}</span> af {stats.total.toLocaleString("da-DK")} valgt
            {stats.errors > 0 && <span className="ml-2 text-destructive">· {stats.errors} fejl</span>}
            {stats.duplicates > 0 && <span className="ml-2 text-amber-600">· {stats.duplicates} dubletter</span>}
          </div>
          <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={reset} disabled={importing} className="h-9">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Start forfra
          </Button>
          <Button onClick={runImport} disabled={importing || stats.selected === 0} className="h-9">
            {importing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
            Importér {stats.selected}
          </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const DataImportTab = ({ businessId, businessName }: { businessId: string; businessName: string }) => {
  const [active, setActive] = useState<EntityType>("customers");
  // Delt fil — så auto-detect kan skifte fane uden at brugeren skal uploade igen.
  const [sharedFile, setSharedFile] = useState<File | null>(null);

  // Lyt på events fra ImportPanel når AI foreslår at skifte til anden entitetstype.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as EntityType;
      if (detail === "customers" || detail === "services" || detail === "orders") {
        setActive(detail);
      }
    };
    window.addEventListener("dataimport:switch-entity", handler);
    return () => window.removeEventListener("dataimport:switch-entity", handler);
  }, []);

  const [existingEmails, setExistingEmails] = useState<Set<string>>(new Set());
  const [existingProductNumbers, setExistingProductNumbers] = useState<Set<string>>(new Set());
  const [existingExternalOrderNumbers, setExistingExternalOrderNumbers] = useState<Set<string>>(new Set());
  // Indeks fra "match-værdi" → læselig identifikation af eksisterende post,
  // så vi kan forklare præcis hvilket felt en dublet blev genkendt på.
  const [existingByEmail, setExistingByEmail] = useState<Record<string, string>>({});
  const [existingByCvr, setExistingByCvr] = useState<Record<string, string>>({});
  const [existingByCustomerNumber, setExistingByCustomerNumber] = useState<Record<string, string>>({});
  const [existingByEan, setExistingByEan] = useState<Record<string, string>>({});
  const [existingByOrderNumber, setExistingByOrderNumber] = useState<Record<string, string>>({});
  const [existingByProductNumber, setExistingByProductNumber] = useState<Record<string, string>>({});
  const [existingServiceNames, setExistingServiceNames] = useState<Record<string, string>>({});
  const [existingCategories, setExistingCategories] = useState<{ category: string; subcategories: string[] }[]>([]);
  const [existingCustomers, setExistingCustomers] = useState<{ id: string; name: string; email: string; cvr?: string | null; phone?: string | null; zip_code?: string | null }[]>([]);
  const [existingServices, setExistingServices] = useState<{ id: string; name: string; product_number?: string | null; unit?: string | null; base_price?: number | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [biz, priv, svc, ord] = await Promise.all([
        supabase.from("business_customers").select("id,company_name,contact_name,email,cvr,phone,zip_code,customer_number,ean_number").eq("business_id", businessId),
        supabase.from("private_customers").select("id,name,email,phone,zip_code,customer_number").eq("business_id", businessId),
        supabase.from("services").select("id,name,product_number,service_category,subcategory,unit,base_price").eq("business_id", businessId),
        supabase.from("orders").select("external_order_number,customer_name,customer_email").eq("business_id", businessId),
      ]);
      if (cancelled) return;
      const emails = new Set<string>();
      const byEmail: Record<string, string> = {};
      const byCvr: Record<string, string> = {};
      const byCustNum: Record<string, string> = {};
      const byEan: Record<string, string> = {};
      (biz.data || []).forEach((r: any) => {
        const label = r.company_name || r.contact_name || r.email || "Erhvervskunde";
        if (r.email) { const k = String(r.email).toLowerCase(); emails.add(k); byEmail[k] = label; }
        if (r.cvr) { const k = String(r.cvr).replace(/\D/g, ""); if (k) byCvr[k] = label; }
        if (r.customer_number) byCustNum[String(r.customer_number).toLowerCase()] = label;
        if (r.ean_number) byEan[String(r.ean_number).replace(/\D/g, "")] = label;
      });
      (priv.data || []).forEach((r: any) => {
        const label = r.name || r.email || "Privatkunde";
        if (r.email) { const k = String(r.email).toLowerCase(); emails.add(k); byEmail[k] = label; }
        if (r.customer_number) byCustNum[String(r.customer_number).toLowerCase()] = label;
      });
      setExistingEmails(emails);
      setExistingByEmail(byEmail);
      setExistingByCvr(byCvr);
      setExistingByCustomerNumber(byCustNum);
      setExistingByEan(byEan);
      const customers = [
        ...((biz.data || []) as any[]).map((c) => ({ id: c.id, name: c.company_name || c.contact_name || c.email, email: c.email, cvr: c.cvr, phone: c.phone, zip_code: c.zip_code })),
        ...((priv.data || []) as any[]).map((c) => ({ id: c.id, name: c.name || c.email, email: c.email, cvr: null, phone: c.phone, zip_code: c.zip_code })),
      ];
      setExistingCustomers(customers);
      const prods = new Set<string>();
      const byProd: Record<string, string> = {};
      const svcNames: Record<string, string> = {};
      (svc.data || []).forEach((r: any) => {
        if (r.product_number) { const k = String(r.product_number).toLowerCase(); prods.add(k); byProd[k] = r.name || r.product_number; }
        if (r.name) svcNames[String(r.name).toLowerCase()] = r.name;
      });
      setExistingProductNumbers(prods);
      setExistingByProductNumber(byProd);
      setExistingServiceNames(svcNames);
      setExistingServices(((svc.data || []) as any[]).map((s) => ({ id: s.id, name: s.name, product_number: s.product_number, unit: s.unit, base_price: s.base_price })));
      const catMap = new Map<string, Set<string>>();
      (svc.data || []).forEach((r: any) => {
        const cat = (r.service_category || "").trim();
        if (!cat) return;
        if (!catMap.has(cat)) catMap.set(cat, new Set());
        const sub = (r.subcategory || "").trim();
        if (sub) catMap.get(cat)!.add(sub);
      });
      setExistingCategories(Array.from(catMap.entries()).map(([category, subs]) => ({ category, subcategories: Array.from(subs) })));
      const ords = new Set<string>();
      const byOrd: Record<string, string> = {};
      (ord.data || []).forEach((r: any) => {
        if (r.external_order_number) {
          const k = String(r.external_order_number).toLowerCase();
          ords.add(k);
          byOrd[k] = r.customer_name || r.customer_email || r.external_order_number;
        }
      });
      setExistingExternalOrderNumbers(ords);
      setExistingByOrderNumber(byOrd);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  const tabs: EntityType[] = ["customers", "services", "orders"];

  if (loading) {
    return <PageSkeleton withStats={false} rows={4} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dataimport"
        description="Træk CSV-filer ind, og lad AI matche kolonnerne automatisk. Du godkender altid før noget oprettes."
      />

      {/* Diskret hjælpe-stribe — mindre fremtrædende end før så fokus
          forbliver på selve upload-flowet. */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
            <HelpCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Lad os klare importen for jer</p>
            <p className="text-xs text-muted-foreground">
              Send eksport-filen — vi importerer kunder, produkter og ordrer for jer.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <a href={`mailto:kontakt@serviceydere.dk?subject=Hj%C3%A6lp%20med%20dataimport%20-%20${encodeURIComponent(businessName)}`}>
            <Mail className="mr-1.5 h-3.5 w-3.5" /> Kontakt os
          </a>
        </Button>
      </div>

      <SectionCard
        title={sharedFile ? "Gennemgå og importér" : "Upload din fil"}
        icon={<UploadCloud />}
        description={sharedFile
          ? "Vi har analyseret filen. Skift mellem kunder, produkter og ordrer for at importere hvert aspekt — det er den samme fil."
          : "Træk én fil ind — vi finder selv ud af om det er kunder, produkter/services eller aftaler/ordrer (eller alt på én gang)."}
      >
        {sharedFile && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vises som:</span>
            <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
              {tabs.map((t) => {
                const m = ENTITY_META[t]; const Icon = m.icon;
                return (
                  <button key={t} onClick={() => setActive(t)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${active === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                    <Icon className="h-3.5 w-3.5" /> {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <ImportPanel
          key={active}
          entity={active}
          businessId={businessId}
          existingEmails={existingEmails}
          existingProductNumbers={existingProductNumbers}
          existingExternalOrderNumbers={existingExternalOrderNumbers}
          existingCategories={existingCategories}
          existingCustomers={existingCustomers}
          existingServices={existingServices}
          existingByEmail={existingByEmail}
          existingByCvr={existingByCvr}
          existingByCustomerNumber={existingByCustomerNumber}
          existingByEan={existingByEan}
          existingByOrderNumber={existingByOrderNumber}
          existingByProductNumber={existingByProductNumber}
          existingServiceNames={existingServiceNames}
          sharedFile={sharedFile}
          onFileChange={setSharedFile}
        />
      </SectionCard>
    </div>
  );
};

export default DataImportTab;