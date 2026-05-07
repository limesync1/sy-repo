// DataImportTab — intelligent CSV-import af kunder.
// 1) Drag-drop af CSV → parses lokalt med papaparse
// 2) AI (Lovable AI Gateway) gætter feltmapping ud fra kolonneoverskrifter + sample
// 3) Brugeren kan justere mapping i preview-tabel og se dubletter/fejl
// 4) Import indsætter til business_customers / private_customers via Supabase
import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  UploadCloud, Loader2, FileText, Sparkles, CheckCircle2, AlertTriangle,
  Trash2, X, ArrowRight, Building2, User, HelpCircle, Mail,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionCard, EmptyState } from "@/components/admin/shared/AdminUI";

type FieldKey =
  | "type" | "name" | "company_name" | "cvr" | "contact_name" | "email"
  | "phone" | "address" | "zip_code" | "city" | "notes"
  | "customer_number" | "ean_number" | "payment_terms_days";

const FIELDS: { key: FieldKey; label: string; required?: boolean }[] = [
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
];

type Mapping = Partial<Record<FieldKey, string>>;
type Row = Record<string, string>;

type PreparedRow = {
  source: Row;
  type: "private" | "business";
  name?: string;
  company_name?: string;
  cvr?: string;
  contact_name?: string;
  email: string;
  phone?: string;
  address?: string;
  zip_code?: string;
  city?: string;
  customer_number?: string;
  ean_number?: string;
  payment_terms_days?: number;
  notes?: string;
  errors: string[];
  isDuplicate?: boolean;
  duplicateReason?: string;
};

const get = (row: Row, mapping: Mapping, key: FieldKey): string | undefined => {
  const col = mapping[key];
  if (!col) return undefined;
  const v = row[col];
  return v === undefined || v === null ? undefined : String(v).trim() || undefined;
};

const detectType = (row: Row, mapping: Mapping, fallback: "private" | "business"): "private" | "business" => {
  const explicit = get(row, mapping, "type");
  if (explicit) {
    const v = explicit.toLowerCase();
    if (["business", "erhverv", "virksomhed", "company", "b2b"].some((s) => v.includes(s))) return "business";
    if (["private", "privat", "person", "b2c"].some((s) => v.includes(s))) return "private";
  }
  if (get(row, mapping, "cvr") || get(row, mapping, "company_name") || get(row, mapping, "ean_number")) return "business";
  return fallback;
};

const DataImportTab = ({ businessId, businessName }: { businessId: string; businessName: string }) => {
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
  const [existingEmails, setExistingEmails] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Forhåndshent eksisterende emails for dublettjek
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [biz, priv] = await Promise.all([
        supabase.from("business_customers").select("email").eq("business_id", businessId),
        supabase.from("private_customers").select("email").eq("business_id", businessId),
      ]);
      if (cancelled) return;
      const set = new Set<string>();
      (biz.data || []).forEach((r: any) => r.email && set.add(String(r.email).toLowerCase()));
      (priv.data || []).forEach((r: any) => r.email && set.add(String(r.email).toLowerCase()));
      setExistingEmails(set);
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  const reset = () => {
    setFile(null); setRows([]); setHeaders([]); setMapping({});
    setAiNotes(null); setConfidence(null); setDone(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith(".csv")) {
      toast.error("Vælg en CSV-fil (.csv)");
      return;
    }
    setFile(f);
    setDone(null);
    Papa.parse<Row>(f, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: async (result) => {
        const parsed = (result.data || []).filter((r) => r && Object.values(r).some((v) => v));
        if (parsed.length === 0) {
          toast.error("CSV-filen er tom eller kunne ikke læses");
          return;
        }
        const hdrs = result.meta.fields || Object.keys(parsed[0] || {});
        setHeaders(hdrs);
        setRows(parsed);
        await runAi(hdrs, parsed.slice(0, 5));
      },
      error: (err) => {
        toast.error("Kunne ikke læse CSV: " + err.message);
      },
    });
  };

  const runAi = async (hdrs: string[], sample: Row[]) => {
    setAiLoading(true); setAiNotes(null);
    try {
      const { data, error } = await supabase.functions.invoke("import-customers-ai", {
        body: { headers: hdrs, sample, defaultType },
      });
      if (error) throw error;
      const m: Mapping = {};
      const raw = (data?.mapping || {}) as Record<string, string | null>;
      for (const f of FIELDS) {
        const v = raw[f.key];
        if (v && hdrs.includes(v)) m[f.key] = v;
      }
      setMapping(m);
      if (data?.default_type === "business" || data?.default_type === "private") setDefaultType(data.default_type);
      setConfidence(typeof data?.confidence === "number" ? data.confidence : null);
      setAiNotes(data?.notes || null);
    } catch (e: any) {
      toast.error("AI-analyse fejlede — du kan vælge felterne manuelt nedenfor");
    } finally {
      setAiLoading(false);
    }
  };

  const prepared: PreparedRow[] = useMemo(() => {
    const seenEmails = new Set<string>();
    return rows.map((row): PreparedRow => {
      const type = detectType(row, mapping, defaultType);
      const email = (get(row, mapping, "email") || "").toLowerCase();
      const errors: string[] = [];
      if (!email) errors.push("Mangler e-mail");
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Ugyldig e-mail");
      if (type === "private" && !get(row, mapping, "name")) errors.push("Mangler navn");
      if (type === "business" && !get(row, mapping, "company_name")) errors.push("Mangler virksomhedsnavn");

      let isDuplicate = false; let duplicateReason: string | undefined;
      if (email && existingEmails.has(email)) { isDuplicate = true; duplicateReason = "Findes allerede i kartoteket"; }
      else if (email && seenEmails.has(email)) { isDuplicate = true; duplicateReason = "Dublet i CSV-filen"; }
      if (email) seenEmails.add(email);

      const ptd = get(row, mapping, "payment_terms_days");
      return {
        source: row, type, email,
        name: get(row, mapping, "name"),
        company_name: get(row, mapping, "company_name"),
        cvr: get(row, mapping, "cvr")?.replace(/\D/g, "") || undefined,
        contact_name: get(row, mapping, "contact_name"),
        phone: get(row, mapping, "phone"),
        address: get(row, mapping, "address"),
        zip_code: get(row, mapping, "zip_code"),
        city: get(row, mapping, "city"),
        customer_number: get(row, mapping, "customer_number"),
        ean_number: get(row, mapping, "ean_number"),
        payment_terms_days: ptd ? Number(ptd) || undefined : undefined,
        notes: get(row, mapping, "notes"),
        errors, isDuplicate, duplicateReason,
      };
    });
  }, [rows, mapping, defaultType, existingEmails]);

  const stats = useMemo(() => {
    const ok = prepared.filter((r) => r.errors.length === 0 && !r.isDuplicate);
    return {
      total: prepared.length,
      ok: ok.length,
      duplicates: prepared.filter((r) => r.isDuplicate).length,
      errors: prepared.filter((r) => r.errors.length > 0).length,
      business: ok.filter((r) => r.type === "business").length,
      private: ok.filter((r) => r.type === "private").length,
    };
  }, [prepared]);

  const runImport = async () => {
    const valid = prepared.filter((r) => r.errors.length === 0 && !r.isDuplicate);
    if (valid.length === 0) { toast.error("Ingen gyldige rækker at importere"); return; }
    setImporting(true);
    try {
      const businessRows = valid.filter((r) => r.type === "business").map((r) => ({
        business_id: businessId,
        company_name: r.company_name || r.name || "",
        cvr: r.cvr || null,
        contact_name: r.contact_name || null,
        email: r.email,
        phone: r.phone || null,
        address: r.address || null,
        zip_code: r.zip_code || null,
        city: r.city || null,
        notes: r.notes || null,
        customer_number: r.customer_number || null,
        ean_number: r.ean_number || null,
        payment_terms_days: r.payment_terms_days ?? null,
      }));
      const privateRows = valid.filter((r) => r.type === "private").map((r) => ({
        business_id: businessId,
        name: r.name || r.company_name || "Ukendt",
        email: r.email,
        phone: r.phone || null,
        address: r.address || null,
        zip_code: r.zip_code || null,
        city: r.city || null,
        notes: r.notes || null,
        customer_number: r.customer_number || null,
        ean_number: r.ean_number || null,
        payment_terms_days: r.payment_terms_days ?? null,
      }));

      let created = 0, skipped = 0;
      const chunk = <T,>(arr: T[], size: number) => {
        const out: T[][] = []; for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size)); return out;
      };
      for (const part of chunk(businessRows, 100)) {
        const { error, data } = await supabase.from("business_customers")
          .upsert(part as any, { onConflict: "business_id,email", ignoreDuplicates: true })
          .select("id");
        if (error) throw error;
        created += data?.length || 0;
        skipped += part.length - (data?.length || 0);
      }
      for (const part of chunk(privateRows, 100)) {
        const { error, data } = await supabase.from("private_customers")
          .upsert(part as any, { onConflict: "business_id,email", ignoreDuplicates: true })
          .select("id");
        if (error) throw error;
        created += data?.length || 0;
        skipped += part.length - (data?.length || 0);
      }
      setDone({ created, skipped });
      toast.success(`Importerede ${created} kunder`);
    } catch (e: any) {
      toast.error("Import fejlede: " + (e?.message || "ukendt fejl"));
    } finally {
      setImporting(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    const f = e.dataTransfer.files?.[0]; if (f) handleFile(f);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Dataimport"
        description="Træk en CSV-fil ind, og lad AI matche kolonnerne automatisk. Du godkender altid før kunderne oprettes."
      />

      {/* Hjælp / kundeservice CTA */}
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <HelpCircle className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Kundeservice kan også hjælpe</p>
              <p className="text-xs text-muted-foreground">
                Send os jeres eksport fra fx SkvizBiz eller Fenster — vi importerer og opretter præcise services/produkter for jer.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <a href={`mailto:kontakt@serviceydere.dk?subject=Hj%C3%A6lp%20med%20dataimport%20-%20${encodeURIComponent(businessName)}`}>
              <Mail className="mr-1.5 h-3.5 w-3.5" />
              Kontakt kundeservice
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Step 1: Upload */}
      {!file && (
        <SectionCard title="1. Vælg eller træk CSV-fil ind" icon={<UploadCloud />}
          description="Eksempelvis fra SkvizBiz, Fenster, Billy, Dinero, e-conomic eller Excel.">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center cursor-pointer transition-colors ${dragActive ? "border-accent bg-accent/5" : "border-border bg-secondary/30 hover:bg-secondary/60"}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5">
              <UploadCloud className="h-6 w-6 text-foreground/70" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Træk CSV-filen hertil</p>
              <p className="text-xs text-muted-foreground">eller klik for at vælge fra computeren</p>
            </div>
            <Badge variant="secondary" className="text-[10.5px]">Maks. 10.000 rækker · UTF-8 anbefalet</Badge>
          </div>
        </SectionCard>
      )}

      {/* Step 2: AI mapping + preview */}
      {file && (
        <>
          <SectionCard
            title="2. AI har analyseret jeres fil"
            icon={<Sparkles />}
            description="Tjek at felterne er matchet korrekt. Du kan ændre mapping nedenfor."
            action={
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="mr-1.5 h-3.5 w-3.5" /> Skift fil
              </Button>
            }
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">{file.name}</span>
                <span className="text-muted-foreground">· {rows.length} rækker · {headers.length} kolonner</span>
                {aiLoading && (
                  <span className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Analyserer…
                  </span>
                )}
                {!aiLoading && confidence !== null && (
                  <span className="ml-auto inline-flex items-center gap-1.5 text-foreground">
                    <CheckCircle2 className="h-3 w-3 text-accent" /> Sikkerhed: {confidence}%
                  </span>
                )}
              </div>
              {aiNotes && (
                <p className="text-xs text-muted-foreground italic">"{aiNotes}"</p>
              )}

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

              <div className="grid gap-2 sm:grid-cols-2">
                {FIELDS.map((f) => (
                  <div key={f.key} className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {f.label}
                        {f.required && <span className="ml-1 text-destructive">*</span>}
                      </p>
                    </div>
                    <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <Select value={mapping[f.key] || "__none__"} onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === "__none__" ? undefined : v }))}>
                      <SelectTrigger className="h-7 w-[160px] text-xs">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-xs">— Ingen —</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* Step 3: Preview */}
          <SectionCard title="3. Forhåndsvisning før import" icon={<CheckCircle2 />}
            description="Gennemse de første rækker. Dubletter og fejl springes automatisk over.">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-3">
              {[
                { label: "Klar", value: stats.ok, tone: "ok" },
                { label: "Erhverv", value: stats.business, tone: "neutral" },
                { label: "Privat", value: stats.private, tone: "neutral" },
                { label: "Dubletter", value: stats.duplicates, tone: "warn" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-border bg-background px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <p className={`text-lg font-bold ${s.tone === "ok" ? "text-accent" : s.tone === "warn" ? "text-amber-600" : "text-foreground"}`}>{s.value}</p>
                </div>
              ))}
            </div>
            {stats.errors > 0 && (
              <div className="mb-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                {stats.errors} række(r) har fejl og bliver sprunget over.
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-secondary/60">
                  <tr className="text-left">
                    <th className="px-2 py-1.5 font-medium">Status</th>
                    <th className="px-2 py-1.5 font-medium">Type</th>
                    <th className="px-2 py-1.5 font-medium">Navn / virksomhed</th>
                    <th className="px-2 py-1.5 font-medium">E-mail</th>
                    <th className="px-2 py-1.5 font-medium">Telefon</th>
                    <th className="px-2 py-1.5 font-medium">Adresse</th>
                  </tr>
                </thead>
                <tbody>
                  {prepared.slice(0, 25).map((r, i) => (
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
                      <td className="px-2 py-1.5">
                        {r.type === "business" ? (
                          <span className="inline-flex items-center gap-1 text-foreground"><Building2 className="h-3 w-3" /> Erhverv</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-foreground"><User className="h-3 w-3" /> Privat</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-foreground">{r.company_name || r.name || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{r.email || "—"}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{r.phone || "—"}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{[r.address, r.zip_code, r.city].filter(Boolean).join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {prepared.length > 25 && (
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Viser 25 af {prepared.length} rækker
              </p>
            )}

            {done ? (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3">
                <CheckCircle2 className="h-5 w-5 text-accent" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Import gennemført</p>
                  <p className="text-xs text-muted-foreground">
                    {done.created} oprettet · {done.skipped} sprunget over
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={reset}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Ny import
                </Button>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <Button variant="ghost" onClick={reset} disabled={importing}>Annullér</Button>
                <Button onClick={runImport} disabled={importing || stats.ok === 0}>
                  {importing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                  Importér {stats.ok} kunde{stats.ok === 1 ? "" : "r"}
                </Button>
              </div>
            )}
          </SectionCard>
        </>
      )}

      {!file && rows.length === 0 && (
        <EmptyState
          icon={<UploadCloud />}
          title="Klar til at importere"
          description="Vælg en fil for at komme i gang. Vi viser et preview før noget oprettes."
        />
      )}
    </div>
  );
};

export default DataImportTab;