// PlatformSecurityTab — internal security status page for admins.
// Shows RLS coverage across all public tables, SECURITY DEFINER function audit,
// storage bucket exposure, and a managed registry of documented findings
// (open / ignored / accepted-risk / fixed) with justifications.
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/admin/shared/AdminUI";
import { StatGridSkeleton, ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { Shield, ShieldAlert, ShieldCheck, RefreshCw, Plus, Database, FileCog, FolderLock, AlertTriangle, CheckCircle2, MinusCircle, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type TableRow = {
  name: string;
  rls_enabled: boolean;
  policies_total: number;
  select_policies: number;
  insert_policies: number;
  update_policies: number;
  delete_policies: number;
};
type Overview = {
  generated_at: string;
  counts: {
    tables_total: number;
    tables_with_rls: number;
    tables_without_rls: number;
    tables_no_policies: number;
    public_buckets: number;
    private_buckets: number;
  };
  tables: TableRow[];
  functions: { total: number; security_definer: number; definer_missing_search_path: number; missing_list: string[] };
  buckets: { id: string; name: string; public: boolean }[];
  findings_summary: { total: number; open: number; ignored: number; fixed: number; accepted_risk: number; critical_open: number };
};

type Finding = {
  id: string;
  scanner_name: string;
  internal_id: string;
  title: string;
  description: string | null;
  severity: "critical" | "high" | "medium" | "low" | "info";
  status: "open" | "ignored" | "fixed" | "accepted_risk";
  justification: string | null;
  affected_resource: string | null;
  updated_at: string;
  created_at: string;
  resolved_at: string | null;
};

const SEVERITY_TONE: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  low: "bg-secondary text-foreground border-border",
  info: "bg-secondary text-muted-foreground border-border",
};
const STATUS_LABEL: Record<Finding["status"], string> = {
  open: "Åben",
  ignored: "Ignoreret",
  fixed: "Fikset",
  accepted_risk: "Accepteret risiko",
};
const STATUS_TONE: Record<Finding["status"], string> = {
  open: "bg-destructive/10 text-destructive border-destructive/20",
  ignored: "bg-secondary text-muted-foreground border-border",
  fixed: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  accepted_risk: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
};

function StatCard({
  label, value, sub, icon: Icon, tone = "default",
}: { label: string; value: string | number; sub?: string; icon: any; tone?: "default" | "danger" | "warn" | "ok" }) {
  const toneRing =
    tone === "danger" ? "ring-destructive/40"
    : tone === "warn" ? "ring-amber-400/40"
    : tone === "ok" ? "ring-emerald-400/40"
    : "ring-border";
  const toneIcon =
    tone === "danger" ? "text-destructive bg-destructive/10"
    : tone === "warn" ? "text-amber-600 bg-amber-100 dark:bg-amber-500/10"
    : tone === "ok" ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10"
    : "text-foreground bg-secondary";
  return (
    <Card className={`rounded-xl border-border p-4 shadow-sm ring-1 ${toneRing}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneIcon}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

const EMPTY_FORM: Partial<Finding> = {
  scanner_name: "manual",
  internal_id: "",
  title: "",
  description: "",
  severity: "medium",
  status: "open",
  justification: "",
  affected_resource: "",
};

function FindingDialog({
  open, onOpenChange, initial, onSaved,
}: { open: boolean; onOpenChange: (b: boolean) => void; initial?: Partial<Finding>; onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState<Partial<Finding>>(initial ?? EMPTY_FORM);
  const isEdit = !!initial?.id;

  const set = (k: keyof Finding, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.internal_id || !form.title) {
      toast.error("Udfyld ID og titel");
      return;
    }
    const payload = {
      scanner_name: form.scanner_name || "manual",
      internal_id: form.internal_id,
      title: form.title,
      description: form.description || null,
      severity: form.severity || "medium",
      status: form.status || "open",
      justification: form.justification || null,
      affected_resource: form.affected_resource || null,
      updated_by: user?.id ?? null,
      resolved_at: form.status === "fixed" ? new Date().toISOString() : null,
    };
    const q = isEdit
      ? supabase.from("security_findings").update(payload).eq("id", initial!.id!)
      : supabase.from("security_findings").insert(payload);
    const { error } = await q;
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isEdit ? "Fund opdateret" : "Fund tilføjet");
    onOpenChange(false);
    setForm(EMPTY_FORM);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Redigér fund" : "Dokumentér nyt fund"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Scanner</label>
              <Input value={form.scanner_name ?? ""} onChange={(e) => set("scanner_name", e.target.value)} placeholder="manual / supabase_lov" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Internt ID</label>
              <Input value={form.internal_id ?? ""} onChange={(e) => set("internal_id", e.target.value)} placeholder="rls_users_open" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Titel</label>
            <Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="Kort beskrivelse" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Påvirket ressource</label>
            <Input value={form.affected_resource ?? ""} onChange={(e) => set("affected_resource", e.target.value)} placeholder="public.tabel / bucket-navn / funktion" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Alvor</label>
              <Select value={form.severity ?? "medium"} onValueChange={(v) => set("severity", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Kritisk</SelectItem>
                  <SelectItem value="high">Høj</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Lav</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
              <Select value={form.status ?? "open"} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Åben</SelectItem>
                  <SelectItem value="ignored">Ignoreret</SelectItem>
                  <SelectItem value="accepted_risk">Accepteret risiko</SelectItem>
                  <SelectItem value="fixed">Fikset</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Beskrivelse</label>
            <Textarea rows={3} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Begrundelse / handling</label>
            <Textarea rows={3} value={form.justification ?? ""} onChange={(e) => set("justification", e.target.value)} placeholder="Hvorfor er det acceptabelt eller hvad blev gjort?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annullér</Button>
          <Button onClick={save}>{isEdit ? "Gem" : "Tilføj"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PlatformSecurityTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState("");
  const [editing, setEditing] = useState<Finding | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const overview = useQuery({
    queryKey: ["admin-security-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_security_overview" as any);
      if (error) throw error;
      return data as unknown as Overview;
    },
    refetchInterval: 120_000,
  });

  const findings = useQuery({
    queryKey: ["admin-security-findings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_findings")
        .select("*")
        .order("status", { ascending: true })
        .order("severity", { ascending: true })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Finding[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("security_findings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fund slettet");
      qc.invalidateQueries({ queryKey: ["admin-security-findings"] });
      qc.invalidateQueries({ queryKey: ["admin-security-overview"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Fejl"),
  });

  const filteredFindings = useMemo(() => {
    const list = findings.data ?? [];
    return statusFilter === "all" ? list : list.filter((f) => f.status === statusFilter);
  }, [findings.data, statusFilter]);

  const filteredTables = useMemo(() => {
    const list = overview.data?.tables ?? [];
    const q = tableFilter.trim().toLowerCase();
    return q ? list.filter((t) => t.name.toLowerCase().includes(q)) : list;
  }, [overview.data, tableFilter]);

  const counts = overview.data?.counts;
  const coveragePct = counts && counts.tables_total
    ? Math.round((counts.tables_with_rls / counts.tables_total) * 100)
    : 0;

  const refreshAll = () => {
    overview.refetch();
    findings.refetch();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sikkerhed"
        description={
          overview.data?.generated_at
            ? `Opdateret ${new Date(overview.data.generated_at).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}`
            : "Policy-dækning, scan-resultater og dokumenterede fund"
        }
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={overview.isFetching || findings.isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${overview.isFetching ? "animate-spin" : ""}`} />
              Opdatér
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Dokumentér fund
            </Button>
          </div>
        }
      />

      {overview.isLoading ? (
        <>
          <StatGridSkeleton count={4} />
          <ListCardSkeleton rows={6} />
        </>
      ) : !overview.data ? (
        <Card className="p-6 text-sm text-muted-foreground">Kunne ikke hente sikkerhedsdata.</Card>
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="RLS-dækning"
              value={`${coveragePct}%`}
              sub={`${counts!.tables_with_rls}/${counts!.tables_total} tabeller`}
              icon={ShieldCheck}
              tone={coveragePct === 100 ? "ok" : coveragePct >= 90 ? "warn" : "danger"}
            />
            <StatCard
              label="Tabeller uden politikker"
              value={counts!.tables_no_policies}
              sub="RLS slået til, men ingen policy"
              icon={ShieldAlert}
              tone={counts!.tables_no_policies > 0 ? "warn" : "ok"}
            />
            <StatCard
              label="Åbne fund"
              value={overview.data.findings_summary.open}
              sub={overview.data.findings_summary.critical_open > 0 ? `${overview.data.findings_summary.critical_open} kritisk/høj` : "ingen kritiske"}
              icon={AlertTriangle}
              tone={overview.data.findings_summary.critical_open > 0 ? "danger" : overview.data.findings_summary.open > 0 ? "warn" : "ok"}
            />
            <StatCard
              label="Ignorerede / accepteret"
              value={overview.data.findings_summary.ignored + overview.data.findings_summary.accepted_risk}
              sub={`${overview.data.findings_summary.fixed} fikset`}
              icon={Shield}
              tone="default"
            />
          </div>

          {/* Infra cards */}
          <div className="grid gap-3 lg:grid-cols-3">
            <Card className="rounded-xl border-border p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <FileCog className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Funktioner</h3>
              </div>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">I alt</dt><dd className="tabular-nums">{overview.data.functions.total}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Security definer</dt><dd className="tabular-nums">{overview.data.functions.security_definer}</dd></div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Mangler search_path</dt>
                  <dd className={cn("tabular-nums font-semibold", overview.data.functions.definer_missing_search_path > 0 ? "text-destructive" : "text-emerald-600")}>
                    {overview.data.functions.definer_missing_search_path}
                  </dd>
                </div>
              </dl>
              {overview.data.functions.missing_list.length > 0 && (
                <div className="mt-2 max-h-32 overflow-auto rounded-md bg-secondary/50 p-2 text-xs">
                  {overview.data.functions.missing_list.map((n) => (
                    <div key={n} className="font-mono text-destructive">{n}</div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="rounded-xl border-border p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <FolderLock className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Storage buckets</h3>
              </div>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Public</dt><dd className="tabular-nums">{counts!.public_buckets}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Private</dt><dd className="tabular-nums">{counts!.private_buckets}</dd></div>
              </dl>
              <div className="mt-2 flex flex-wrap gap-1">
                {overview.data.buckets.map((b) => (
                  <Badge key={b.id} variant="outline" className={cn("text-[10px]", b.public ? "border-amber-300 text-amber-700 dark:text-amber-300" : "border-emerald-300 text-emerald-700 dark:text-emerald-300")}>
                    {b.public ? "🌐" : "🔒"} {b.name}
                  </Badge>
                ))}
              </div>
            </Card>

            <Card className="rounded-xl border-border p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Tabel-sammendrag</h3>
              </div>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Med RLS</dt><dd className="tabular-nums text-emerald-600">{counts!.tables_with_rls}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Uden RLS</dt><dd className={cn("tabular-nums", counts!.tables_without_rls > 0 ? "text-destructive font-semibold" : "")}>{counts!.tables_without_rls}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Uden politikker</dt><dd className="tabular-nums">{counts!.tables_no_policies}</dd></div>
              </dl>
            </Card>
          </div>

          {/* Tables table */}
          <Card className="rounded-xl border-border shadow-sm">
            <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Policy-dækning pr. tabel</h3>
              </div>
              <div className="relative ml-auto">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} placeholder="Søg tabel…" className="h-8 w-48 pl-7 text-xs" />
              </div>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-secondary/80 backdrop-blur text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Tabel</th>
                    <th className="px-2 py-2 text-left">RLS</th>
                    <th className="px-2 py-2 text-right">Total</th>
                    <th className="px-2 py-2 text-right">SEL</th>
                    <th className="px-2 py-2 text-right">INS</th>
                    <th className="px-2 py-2 text-right">UPD</th>
                    <th className="px-2 py-2 text-right">DEL</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTables.map((t) => {
                    const danger = !t.rls_enabled || t.policies_total === 0;
                    return (
                      <tr key={t.name} className={cn("border-t border-border", danger && "bg-destructive/5")}>
                        <td className="px-3 py-1.5 font-mono">{t.name}</td>
                        <td className="px-2 py-1.5">
                          {t.rls_enabled
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            : <MinusCircle className="h-3.5 w-3.5 text-destructive" />}
                        </td>
                        <td className={cn("px-2 py-1.5 text-right tabular-nums", t.policies_total === 0 && "text-destructive font-semibold")}>{t.policies_total}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{t.select_policies}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{t.insert_policies}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{t.update_policies}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{t.delete_policies}</td>
                      </tr>
                    );
                  })}
                  {filteredTables.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Ingen tabeller matcher</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Findings registry */}
      <Card className="rounded-xl border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Dokumenterede fund</h3>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statusser</SelectItem>
              <SelectItem value="open">Åbne</SelectItem>
              <SelectItem value="ignored">Ignorerede</SelectItem>
              <SelectItem value="accepted_risk">Accepteret risiko</SelectItem>
              <SelectItem value="fixed">Fiksede</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {findings.isLoading ? (
          <div className="p-4"><ListCardSkeleton rows={3} /></div>
        ) : filteredFindings.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Ingen fund dokumenteret endnu. Brug "Dokumentér fund" for at registrere ignorerede eller accepterede sikkerhedsbeslutninger med begrundelse.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filteredFindings.map((f) => (
              <li key={f.id} className="p-3">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={cn("text-[10px]", SEVERITY_TONE[f.severity])}>{f.severity}</Badge>
                      <Badge variant="outline" className={cn("text-[10px]", STATUS_TONE[f.status])}>{STATUS_LABEL[f.status]}</Badge>
                      <span className="text-sm font-semibold text-foreground">{f.title}</span>
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {f.scanner_name}/{f.internal_id}
                      {f.affected_resource && <> · <span className="text-foreground">{f.affected_resource}</span></>}
                    </div>
                    {f.description && <p className="mt-1.5 text-xs text-muted-foreground">{f.description}</p>}
                    {f.justification && (
                      <div className="mt-2 rounded-md border-l-2 border-accent bg-secondary/50 px-2 py-1.5 text-xs">
                        <span className="font-semibold text-foreground">Begrundelse: </span>
                        <span className="text-muted-foreground">{f.justification}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditing(f)} aria-label="Redigér">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => {
                        if (confirm(`Slet "${f.title}"?`)) del.mutate(f.id);
                      }}
                      aria-label="Slet"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <FindingDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={() => { findings.refetch(); overview.refetch(); }} />
      {editing && (
        <FindingDialog
          open={!!editing}
          onOpenChange={(b) => !b && setEditing(null)}
          initial={editing}
          onSaved={() => { setEditing(null); findings.refetch(); overview.refetch(); }}
        />
      )}
    </div>
  );
}