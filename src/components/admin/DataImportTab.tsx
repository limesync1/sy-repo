// DataImportTab — intelligent CSV-import til kunder, services/produkter og ordrer/aftaler.
// Hver entity-type har sin egen drop-zone, AI-mapping og preview.
import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  UploadCloud, Loader2, FileText, Sparkles, CheckCircle2, AlertTriangle,
  Trash2, X, ArrowRight, Building2, User, HelpCircle, Mail, Users, Package, ClipboardList, FolderTree, Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionCard, EmptyState } from "@/components/admin/shared/AdminUI";

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
    { key: "email", label: "E-mail", required: true },
    { key: "phone", label: "Telefon" },
    { key: "address", label: "Adresse" },
    { key: "zip_code", label: "Postnummer" },
    { key: "city", label: "By" },
    { key: "customer_number", label: "Kundenummer" },
    { key: "ean_number", label: "EAN-nummer" },
    { key: "payment_terms_days", label: "Betalingsfrist (dage)" },
    { key: "notes", label: "Noter" },
  ],
  services: [
    { key: "name", label: "Navn", required: true },
    { key: "description", label: "Beskrivelse" },
    { key: "base_price", label: "Pris" },
    { key: "unit", label: "Enhed (stk, time, m²)" },
    { key: "product_number", label: "Varenummer" },
    { key: "service_category", label: "Kategori" },
    { key: "subcategory", label: "Underkategori" },
    { key: "default_vat_rate", label: "Momssats %" },
    { key: "accounting_account_number", label: "Bogføringskonto" },
  ],
  orders: [
    { key: "external_order_number", label: "Ordre-/fakturanr." },
    { key: "customer_email", label: "Kunde e-mail", required: true },
    { key: "customer_name", label: "Kundenavn" },
    { key: "customer_phone", label: "Kunde telefon" },
    { key: "company_name", label: "Virksomhedsnavn" },
    { key: "cvr", label: "CVR" },
    { key: "address", label: "Adresse" },
    { key: "zip_code", label: "Postnummer" },
    { key: "city", label: "By" },
    { key: "service_name", label: "Produkt/service" },
    { key: "quantity", label: "Antal" },
    { key: "unit_price", label: "Stykpris" },
    { key: "total_amount", label: "Beløb i alt" },
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

const detectCustomerType = (row: Row, mapping: Mapping, fallback: "private" | "business"): "private" | "business" => {
  const explicit = get(row, mapping, "type");
  if (explicit) {
    const v = explicit.toLowerCase();
    if (["business", "erhverv", "virksomhed", "company", "b2b"].some((s) => v.includes(s))) return "business";
    if (["private", "privat", "person", "b2c"].some((s) => v.includes(s))) return "private";
  }
  if (get(row, mapping, "cvr") || get(row, mapping, "company_name") || get(row, mapping, "ean_number")) return "business";
  return fallback;
};

// ---------- Per-entity import-panel ----------
const ImportPanel = ({
  entity, businessId, existingEmails, existingProductNumbers, existingExternalOrderNumbers, existingCategories, existingCustomers, existingServices,
}: {
  entity: EntityType;
  businessId: string;
  existingEmails: Set<string>;
  existingProductNumbers: Set<string>;
  existingExternalOrderNumbers: Set<string>;
  existingCategories: { category: string; subcategories: string[] }[];
  existingCustomers: { id: string; name: string; email: string; cvr?: string | null; phone?: string | null; zip_code?: string | null }[];
  existingServices: { id: string; name: string; product_number?: string | null; unit?: string | null; base_price?: number | null }[];
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

  const reset = () => {
    setFile(null); setRows([]); setHeaders([]); setMapping({});
    setAiNotes(null); setConfidence(null); setDone(null);
    setClassifications({});
    setOrderMatches({});
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (f: File) => {
    if (!f.name.toLowerCase().endsWith(".csv")) {
      toast.error("Vælg en CSV-fil (.csv)");
      return;
    }
    setFile(f); setDone(null);

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
        await runAi(hdrs, parsed.slice(0, 5));
      },
      error: (err: any) => toast.error("Kunne ikke læse CSV: " + err.message),
    });
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
        if (!email) errors.push("Mangler e-mail");
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Ugyldig e-mail");
        if (type === "private" && !get(row, mapping, "name")) errors.push("Mangler navn");
        if (type === "business" && !get(row, mapping, "company_name")) errors.push("Mangler virksomhedsnavn");
        if (email && existingEmails.has(email)) { isDuplicate = true; duplicateReason = "Findes allerede"; }
        else if (email && seenEmails.has(email)) { isDuplicate = true; duplicateReason = "Dublet i fil"; }
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
        if (dupKey && existingProductNumbers.has(dupKey)) { isDuplicate = true; duplicateReason = "Varenr. findes"; }
        else if (dupKey && seenProductNumbers.has(dupKey)) { isDuplicate = true; duplicateReason = "Dublet i fil"; }
        if (dupKey) seenProductNumbers.add(dupKey);
        const idx = rows.indexOf(row);
        const ai = classifications[idx];
        const rawCat = get(row, mapping, "service_category");
        const rawSub = get(row, mapping, "subcategory");
        const final_category = rawCat || ai?.service_category || undefined;
        const final_subcategory = rawSub || ai?.subcategory || undefined;
        return {
          source: row, kind: "service" as const,
          name: name || "",
          description: get(row, mapping, "description"),
          base_price: parseNum(get(row, mapping, "base_price")),
          unit: get(row, mapping, "unit"),
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
      if (!customer_email && !match?.customer_id) errors.push("Mangler kunde e-mail eller match");
      else if (customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) errors.push("Ugyldig kunde e-mail");
      const dupKey = ext?.toLowerCase();
      if (dupKey && existingExternalOrderNumbers.has(dupKey)) { isDuplicate = true; duplicateReason = "Ordrenr. findes"; }
      else if (dupKey && seenOrderNumbers.has(dupKey)) { isDuplicate = true; duplicateReason = "Dublet i fil"; }
      if (dupKey) seenOrderNumbers.add(dupKey);

      const qty = parseNum(get(row, mapping, "quantity")) ?? 1;
      const rawUnitPrice = parseNum(get(row, mapping, "unit_price"));
      const unit_price = rawUnitPrice ?? (match?.inferred_unit_price ?? undefined);
      const total_amount = parseNum(get(row, mapping, "total_amount")) ?? (unit_price ? unit_price * qty : 0);
      const matchedCustomer = match?.customer_id ? existingCustomers.find((c) => c.id === match.customer_id) : undefined;
      const matchedService = match?.service_id ? existingServices.find((s) => s.id === match.service_id) : undefined;
      return {
        source: row, kind: "order" as const,
        external_order_number: ext,
        customer_email: customer_email || matchedCustomer?.email || "",
        customer_name: get(row, mapping, "customer_name") || get(row, mapping, "company_name") || matchedCustomer?.name || "Ukendt",
        customer_phone: cleanPhone(get(row, mapping, "customer_phone")),
        company_name: get(row, mapping, "company_name"),
        cvr: get(row, mapping, "cvr")?.replace(/\D/g, "") || undefined,
        address: get(row, mapping, "address"),
        zip_code: get(row, mapping, "zip_code"),
        city: get(row, mapping, "city"),
        service_name: get(row, mapping, "service_name") || "Importeret ordrelinje",
        quantity: qty,
        unit_price: unit_price ?? total_amount / Math.max(qty, 1),
        total_amount,
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
  }, [rows, mapping, defaultType, entity, existingEmails, existingProductNumbers, existingExternalOrderNumbers, classifications, orderMatches, existingCustomers, existingServices]);

  const stats = useMemo(() => ({
    total: prepared.length,
    ok: prepared.filter((r) => r.errors.length === 0 && !r.isDuplicate).length,
    duplicates: prepared.filter((r) => r.isDuplicate).length,
    errors: prepared.filter((r) => r.errors.length > 0).length,
  }), [prepared]);

  const runImport = async () => {
    const valid = prepared.filter((r) => r.errors.length === 0 && !r.isDuplicate);
    if (valid.length === 0) { toast.error("Ingen gyldige rækker"); return; }
    setImporting(true);
    try {
      let created = 0;
      const chunk = <T,>(arr: T[], size: number): T[][] => { const o: T[][] = []; for (let i = 0; i < arr.length; i += size) o.push(arr.slice(i, i + size)); return o; };

      if (entity === "customers") {
        const biz = (valid as any[]).filter((r) => r.type === "business").map((r) => ({
          business_id: businessId, company_name: r.company_name || r.name || "",
          cvr: r.cvr || null, contact_name: r.contact_name || null, email: r.email,
          phone: r.phone || null, address: r.address || null, zip_code: r.zip_code || null, city: r.city || null,
          notes: r.notes || null, customer_number: r.customer_number || null,
          ean_number: r.ean_number || null, payment_terms_days: r.payment_terms_days ?? null,
        }));
        const priv = (valid as any[]).filter((r) => r.type === "private").map((r) => ({
          business_id: businessId, name: r.name || r.company_name || "Ukendt", email: r.email,
          phone: r.phone || null, address: r.address || null, zip_code: r.zip_code || null, city: r.city || null,
          notes: r.notes || null, customer_number: r.customer_number || null,
          ean_number: r.ean_number || null, payment_terms_days: r.payment_terms_days ?? null,
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
          description: r.description || null,
          base_price: r.base_price ?? null,
          unit: r.unit || null,
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
        // orders — opret order + 1 line per række
        for (const r of valid as any[]) {
          const { data: orderRow, error: orderErr } = await supabase.from("orders").insert({
            business_id: businessId,
            customer_id: r.matched_customer_id || null,
            customer_name: r.customer_name,
            customer_email: r.customer_email,
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
            notes: r.notes || null,
          } as any).select("id").single();
          if (orderErr) throw orderErr;
          const { error: itemErr } = await supabase.from("order_items").insert({
            order_id: orderRow.id,
            service_id: r.matched_service_id || null,
            service_name: r.service_name,
            quantity: r.quantity,
            unit_price: r.unit_price,
            total_price: r.total_amount,
          } as any);
          if (itemErr) throw itemErr;
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

  if (!file) {
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors ${dragActive ? "border-accent bg-accent/5" : "border-border bg-secondary/30 hover:bg-secondary/60"}`}
      >
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground/5">
          <Icon className="h-5 w-5 text-foreground/70" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Træk {meta.label.toLowerCase()}-CSV hertil</p>
          <p className="text-xs text-muted-foreground">{meta.desc}</p>
        </div>
        <Badge variant="secondary" className="text-[10.5px]">Maks. 10.000 rækker · UTF-8 anbefalet</Badge>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium text-foreground">{file.name}</span>
        <span className="text-muted-foreground">· {rows.length} rækker · {headers.length} kolonner</span>
        {aiLoading && <span className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Analyserer…</span>}
        {!aiLoading && confidence !== null && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-foreground">
            <CheckCircle2 className="h-3 w-3 text-accent" /> Sikkerhed: {confidence}%
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={reset} className="h-6 px-2"><X className="h-3 w-3" /></Button>
      </div>
      {aiNotes && <p className="text-xs italic text-muted-foreground">"{aiNotes}"</p>}

      {entity === "services" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs">
          <FolderTree className="h-3.5 w-3.5 text-accent" />
          <span className="font-medium text-foreground">Smart kategorisering</span>
          <span className="text-muted-foreground">
            AI matcher hver række ind i jeres {existingCategories.length} eksisterende kategorier — eller foreslår nye markeret med <Sparkles className="inline h-2.5 w-2.5" />.
          </span>
          {classifying && <span className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Klassificerer…</span>}
          {!classifying && Object.keys(classifications).length > 0 && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-foreground">
              <Wand2 className="h-3 w-3 text-accent" /> {Object.keys(classifications).length} klassificeret
            </span>
          )}
        </div>
      )}

      {entity === "orders" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs">
          <Wand2 className="h-3.5 w-3.5 text-accent" />
          <span className="font-medium text-foreground">Smart matching</span>
          <span className="text-muted-foreground">
            AI kobler hver ordre til eksisterende kunder ({existingCustomers.length}) og services ({existingServices.length}) — på email, CVR, varenummer eller navn.
          </span>
          {matching && <span className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Matcher…</span>}
          {!matching && Object.keys(orderMatches).length > 0 && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-foreground">
              <CheckCircle2 className="h-3 w-3 text-accent" /> {Object.values(orderMatches).filter((m: any) => m.customer_id).length} kunder · {Object.values(orderMatches).filter((m: any) => m.service_id).length} services matchet
            </span>
          )}
        </div>
      )}

      {entity === "customers" && (
        <div>
          <p className="mb-2 text-xs font-semibold text-foreground">Standard kundetype (når ikke angivet)</p>
          <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
            {(["private", "business"] as const).map((t) => (
              <button key={t} onClick={() => setDefaultType(t)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${defaultType === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                {t === "private" ? "Privat" : "Erhverv"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">
                {f.label}{f.required && <span className="ml-1 text-destructive">*</span>}
              </p>
            </div>
            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
            <Select value={mapping[f.key] || "__none__"} onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === "__none__" ? undefined : v }))}>
              <SelectTrigger className="h-7 w-[160px] text-xs"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs">— Ingen —</SelectItem>
                {headers.map((h) => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Klar", value: stats.ok, tone: "ok" },
          { label: "Total", value: stats.total, tone: "neutral" },
          { label: "Dubletter", value: stats.duplicates, tone: "warn" },
          { label: "Fejl", value: stats.errors, tone: stats.errors > 0 ? "err" : "neutral" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-background px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className={`text-lg font-bold ${s.tone === "ok" ? "text-accent" : s.tone === "warn" ? "text-amber-600" : s.tone === "err" ? "text-destructive" : "text-foreground"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead className="bg-secondary/60">
            <tr className="text-left">
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
                <th className="px-2 py-1.5 font-medium">Varenr.</th>
                <th className="px-2 py-1.5 font-medium">Kategori → Underkategori</th>
              </>}
              {entity === "orders" && <>
                <th className="px-2 py-1.5 font-medium">Ordrenr.</th>
                <th className="px-2 py-1.5 font-medium">Kunde</th>
                <th className="px-2 py-1.5 font-medium">Linje</th>
                <th className="px-2 py-1.5 font-medium">Beløb</th>
                <th className="px-2 py-1.5 font-medium">Dato</th>
              </>}
            </tr>
          </thead>
          <tbody>
            {prepared.slice(0, 25).map((r: any, i) => (
              <tr key={i} className="border-t border-border hover:bg-secondary/30">
                <td className="px-2 py-1.5">
                  {r.errors.length > 0 ? (
                    <Badge variant="destructive" className="text-[10px]" title={r.errors.join(", ")}>Fejl</Badge>
                  ) : r.isDuplicate ? (
                    <Badge variant="secondary" className="text-[10px]" title={r.duplicateReason}>Dublet</Badge>
                  ) : (
                    <Badge className="bg-accent/15 text-accent hover:bg-accent/20 text-[10px]">Klar</Badge>
                  )}
                </td>
                {entity === "customers" && <>
                  <td className="px-2 py-1.5">{r.type === "business"
                    ? <span className="inline-flex items-center gap-1 text-foreground"><Building2 className="h-3 w-3" /> Erhverv</span>
                    : <span className="inline-flex items-center gap-1 text-foreground"><User className="h-3 w-3" /> Privat</span>}</td>
                  <td className="px-2 py-1.5 text-foreground">{r.company_name || r.name || "—"}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{r.email || "—"}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{r.phone || "—"}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{r.city || "—"}</td>
                </>}
                {entity === "services" && <>
                  <td className="px-2 py-1.5 text-foreground">{r.name || "—"}</td>
                  <td className="px-2 py-1.5 text-foreground">{r.base_price != null ? r.base_price.toLocaleString("da-DK") + " kr" : "—"}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{r.unit || "—"}</td>
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
                      <span className="text-foreground">{r.service_name} × {r.quantity}</span>
                      {r.matched_service_id ? (
                        <Badge className="w-fit bg-accent/15 text-accent hover:bg-accent/20 text-[10px]" title={r.service_match_reason}>
                          <CheckCircle2 className="mr-1 h-2.5 w-2.5" /> {r.matched_service_name || "Eksisterende"}{typeof r.service_confidence === "number" ? ` · ${r.service_confidence}%` : ""}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="w-fit text-[10px]"><Sparkles className="mr-1 h-2.5 w-2.5" /> Ny linje</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-foreground">{r.total_amount?.toLocaleString("da-DK")} kr</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{r.preferred_date || "—"}</td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {prepared.length > 25 && <p className="text-center text-[11px] text-muted-foreground">Viser 25 af {prepared.length} rækker</p>}

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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" onClick={reset} disabled={importing}>Annullér</Button>
          <Button onClick={runImport} disabled={importing || stats.ok === 0}>
            {importing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
            Importér {stats.ok}
          </Button>
        </div>
      )}
    </div>
  );
};

const DataImportTab = ({ businessId, businessName }: { businessId: string; businessName: string }) => {
  const [active, setActive] = useState<EntityType>("customers");
  const [existingEmails, setExistingEmails] = useState<Set<string>>(new Set());
  const [existingProductNumbers, setExistingProductNumbers] = useState<Set<string>>(new Set());
  const [existingExternalOrderNumbers, setExistingExternalOrderNumbers] = useState<Set<string>>(new Set());
  const [existingCategories, setExistingCategories] = useState<{ category: string; subcategories: string[] }[]>([]);
  const [existingCustomers, setExistingCustomers] = useState<{ id: string; name: string; email: string; cvr?: string | null; phone?: string | null; zip_code?: string | null }[]>([]);
  const [existingServices, setExistingServices] = useState<{ id: string; name: string; product_number?: string | null; unit?: string | null; base_price?: number | null }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [biz, priv, svc, ord] = await Promise.all([
        supabase.from("business_customers").select("id,company_name,contact_name,email,cvr,phone,zip_code").eq("business_id", businessId),
        supabase.from("private_customers").select("id,name,email,phone,zip_code").eq("business_id", businessId),
        supabase.from("services").select("id,name,product_number,service_category,subcategory,unit,base_price").eq("business_id", businessId),
        supabase.from("orders").select("external_order_number").eq("business_id", businessId),
      ]);
      if (cancelled) return;
      const emails = new Set<string>();
      (biz.data || []).forEach((r: any) => r.email && emails.add(String(r.email).toLowerCase()));
      (priv.data || []).forEach((r: any) => r.email && emails.add(String(r.email).toLowerCase()));
      setExistingEmails(emails);
      const customers = [
        ...((biz.data || []) as any[]).map((c) => ({ id: c.id, name: c.company_name || c.contact_name || c.email, email: c.email, cvr: c.cvr, phone: c.phone, zip_code: c.zip_code })),
        ...((priv.data || []) as any[]).map((c) => ({ id: c.id, name: c.name || c.email, email: c.email, cvr: null, phone: c.phone, zip_code: c.zip_code })),
      ];
      setExistingCustomers(customers);
      const prods = new Set<string>();
      (svc.data || []).forEach((r: any) => r.product_number && prods.add(String(r.product_number).toLowerCase()));
      setExistingProductNumbers(prods);
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
      (ord.data || []).forEach((r: any) => r.external_order_number && ords.add(String(r.external_order_number).toLowerCase()));
      setExistingExternalOrderNumbers(ords);
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  const tabs: EntityType[] = ["customers", "services", "orders"];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Dataimport"
        description="Træk CSV-filer ind, og lad AI matche kolonnerne automatisk. Du godkender altid før noget oprettes."
      />

      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <HelpCircle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Kundeservice kan også hjælpe</p>
              <p className="text-xs text-muted-foreground">
                Send os jeres eksport — vi importerer kunder, produkter og ordrer for jer.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <a href={`mailto:kontakt@serviceydere.dk?subject=Hj%C3%A6lp%20med%20dataimport%20-%20${encodeURIComponent(businessName)}`}>
              <Mail className="mr-1.5 h-3.5 w-3.5" /> Kontakt kundeservice
            </a>
          </Button>
        </CardContent>
      </Card>

      <SectionCard
        title="Vælg hvad du vil importere"
        icon={<UploadCloud />}
        description="Du kan importere kunder, produkter/services og ordrer/aftaler hver for sig."
      >
        <div className="mb-4 inline-flex rounded-lg border border-border bg-background p-0.5">
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
        />
      </SectionCard>
    </div>
  );
};

export default DataImportTab;