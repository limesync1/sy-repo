// PlatformMailsTab — admin-overblik over e-mailtrafik på platformen.
// Tre sektioner: Send-log (deduplikeret pr. besked), Skabeloner (live HTML-preview
// + mulighed for at sende test-mail) og Blokerede modtagere (suppression-listen).
// Henter alle data via SECURITY DEFINER RPC'er + admin-preview-template edge function.
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { PageHeader, SearchInput, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton, StatGridSkeleton } from "@/components/admin/shared/Skeletons";
import { Mail, MailX, Ban, Send, Eye, RefreshCw, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  sent: "Leveret",
  pending: "Afventer",
  suppressed: "Blokeret",
  failed: "Fejlet",
  bounced: "Bounced",
  complained: "Klage",
  dlq: "DLQ",
};
const STATUS_TONE: Record<string, string> = {
  sent: "border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  pending: "border-border bg-secondary/60 text-foreground",
  suppressed: "border-amber-400/40 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
  bounced: "border-destructive/40 bg-destructive/10 text-destructive",
  complained: "border-destructive/40 bg-destructive/10 text-destructive",
  dlq: "border-destructive/40 bg-destructive/10 text-destructive",
};
const RANGES = [
  { value: "24h", label: "24 timer", hours: 24 },
  { value: "7d", label: "7 dage", hours: 24 * 7 },
  { value: "30d", label: "30 dage", hours: 24 * 30 },
  { value: "all", label: "Alle", hours: 0 },
];

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("da-DK", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/* ------------------------------ Send-log ------------------------------ */
function SendLogView() {
  const [q, setQ] = useState("");
  const [template, setTemplate] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [range, setRange] = useState<string>("7d");
  const [openRow, setOpenRow] = useState<any | null>(null);

  const sinceIso = useMemo(() => {
    const r = RANGES.find((x) => x.value === range);
    if (!r || r.hours === 0) return null;
    return new Date(Date.now() - r.hours * 3_600_000).toISOString();
  }, [range]);

  const { data: rows, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-email-log", template, status, q, sinceIso],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_email_send_log" as any, {
        p_limit: 300,
        p_template: template === "all" ? null : template,
        p_status: status === "all" ? null : status,
        p_search: q.trim() || null,
        p_since: sinceIso,
      });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["admin-email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_email_distinct_templates" as any);
      if (error) throw error;
      return (data || []) as { template_name: string; n: number }[];
    },
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: 0, sent: 0, failed: 0, suppressed: 0 };
    (rows || []).forEach((r: any) => {
      c.total++;
      if (r.status === "sent") c.sent++;
      else if (["failed", "bounced", "complained", "dlq"].includes(r.status)) c.failed++;
      else if (r.status === "suppressed") c.suppressed++;
    });
    return c;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Unikke mails", value: counts.total, icon: Mail },
          { label: "Leveret", value: counts.sent, icon: Mail, tone: "ok" },
          { label: "Fejlet", value: counts.failed, icon: MailX, tone: counts.failed > 0 ? "danger" : "default" },
          { label: "Blokeret", value: counts.suppressed, icon: Ban, tone: counts.suppressed > 0 ? "warn" : "default" },
        ].map((s: any) => (
          <Card key={s.label} className="rounded-xl border-border p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{s.value.toLocaleString("da-DK")}</p>
              </div>
              <div className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                s.tone === "ok" ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10"
                : s.tone === "danger" ? "text-destructive bg-destructive/10"
                : s.tone === "warn" ? "text-amber-600 bg-amber-100 dark:bg-amber-500/10"
                : "text-foreground bg-secondary",
              )}>
                <s.icon className="h-4 w-4" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Søg modtager eller skabelon..." />
        <Select value={template} onValueChange={setTemplate}>
          <SelectTrigger className="w-[220px] h-9"><SelectValue placeholder="Skabelon" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle skabeloner</SelectItem>
            {(templates || []).map((t) => (
              <SelectItem key={t.template_name} value={t.template_name}>
                {t.template_name} ({t.n})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isFetching && "animate-spin")} />
          Opdatér
        </Button>
      </div>

      {isLoading ? (
        <ListCardSkeleton rows={6} />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon={<Mail />} title="Ingen e-mails fundet" description="Prøv at justere filtrene eller dato-range." />
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <button
                key={r.message_id}
                onClick={() => setOpenRow(r)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/30"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{r.recipient_email}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="font-mono">{r.template_name}</span>
                    {r.error_message && <span className="text-destructive"> · {r.error_message}</span>}
                  </p>
                </div>
                <Badge variant="outline" className={STATUS_TONE[r.status] || ""}>{STATUS_LABEL[r.status] || r.status}</Badge>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground w-24 text-right">{fmtTime(r.created_at)}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={!!openRow} onOpenChange={(o) => !o && setOpenRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>E-maildetaljer</DialogTitle>
            <DialogDescription>Sidste status for denne besked.</DialogDescription>
          </DialogHeader>
          {openRow && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-xs text-muted-foreground">Modtager</div>
                <div className="col-span-2 break-all">{openRow.recipient_email}</div>
                <div className="text-xs text-muted-foreground">Skabelon</div>
                <div className="col-span-2 font-mono">{openRow.template_name}</div>
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="col-span-2">
                  <Badge variant="outline" className={STATUS_TONE[openRow.status] || ""}>{STATUS_LABEL[openRow.status] || openRow.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">Tidspunkt</div>
                <div className="col-span-2 tabular-nums">{fmtTime(openRow.created_at)}</div>
                <div className="text-xs text-muted-foreground">Message ID</div>
                <div className="col-span-2 font-mono text-xs break-all">{openRow.message_id}</div>
              </div>
              {openRow.error_message && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  {openRow.error_message}
                </div>
              )}
              {openRow.metadata && Object.keys(openRow.metadata).length > 0 && (
                <pre className="overflow-x-auto rounded-md border border-border bg-secondary/40 p-3 text-[11px]">
{JSON.stringify(openRow.metadata, null, 2)}
                </pre>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ----------------------------- Skabeloner ----------------------------- */
function TemplatesView() {
  const [selected, setSelected] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState("");
  const [sending, setSending] = useState(false);

  const { data: list, isLoading: listLoading } = useQuery({
    queryKey: ["admin-template-list"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-preview-template", { method: "GET" });
      if (error) throw error;
      return (data?.templates || []) as { name: string; displayName: string; hasPreview: boolean }[];
    },
  });

  const { data: preview, isLoading: previewLoading, isFetching: previewFetching } = useQuery({
    queryKey: ["admin-template-preview", selected],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-preview-template", {
        body: { templateName: selected },
      });
      if (error) throw error;
      return data as { displayName: string; subject: string; html: string; previewData: any; renderError: string | null };
    },
    enabled: !!selected,
  });

  const sendTest = async () => {
    if (!selected || !sendEmail.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: selected,
          recipientEmail: sendEmail.trim(),
          idempotencyKey: `admin-test-${selected}-${Date.now()}`,
          templateData: preview?.previewData ?? {},
        },
      });
      if (error) throw error;
      toast.success(`Test sendt til ${sendEmail.trim()}`);
      setSendOpen(false);
      setSendEmail("");
    } catch (e: any) {
      toast.error("Kunne ikke sende", { description: e.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="rounded-xl border-border shadow-sm overflow-hidden">
        <div className="border-b border-border bg-secondary/40 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Skabeloner {list ? `(${list.length})` : ""}
        </div>
        {listLoading ? (
          <div className="p-3"><ListCardSkeleton rows={6} /></div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto divide-y divide-border">
            {(list || []).map((t) => (
              <button
                key={t.name}
                onClick={() => setSelected(t.name)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                  selected === t.name ? "bg-secondary text-foreground" : "hover:bg-secondary/50 text-foreground",
                )}
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.displayName}</p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">{t.name}</p>
                </div>
                {!t.hasPreview && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card className="rounded-xl border-border shadow-sm overflow-hidden min-h-[600px] flex flex-col">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState icon={<Eye />} title="Vælg en skabelon" description="Klik på en skabelon i listen for at se preview." />
          </div>
        ) : previewLoading ? (
          <div className="p-6 space-y-3">
            <StatGridSkeleton count={2} />
            <ListCardSkeleton rows={6} />
          </div>
        ) : preview?.renderError ? (
          <div className="p-6">
            <Card className="border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Kunne ikke rendere: {preview.renderError}
            </Card>
          </div>
        ) : preview ? (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Emne</p>
                <p className="truncate text-sm font-semibold text-foreground">{preview.subject || "—"}</p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{selected}</p>
              </div>
              <Button size="sm" onClick={() => setSendOpen(true)} disabled={previewFetching}>
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Send test
              </Button>
            </div>
            <iframe
              title="email preview"
              srcDoc={preview.html}
              className="flex-1 w-full bg-white"
              sandbox=""
            />
          </>
        ) : null}
      </Card>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send test-mail</DialogTitle>
            <DialogDescription>
              Sender skabelonen <span className="font-mono">{selected}</span> med dens preview-data til en valgt modtager.
              Mailen tæller som en almindelig transactional-mail og logges i send-loggen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Modtager-email</label>
            <Input type="email" value={sendEmail} onChange={(e) => setSendEmail(e.target.value)} placeholder="modtager@eksempel.dk" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)} disabled={sending}>Annullér</Button>
            <Button onClick={sendTest} disabled={sending || !sendEmail.trim()}>
              {sending ? "Sender..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* --------------------------- Blokerede mails -------------------------- */
function SuppressedView() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-suppressed-emails"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_suppressed_emails" as any, { p_limit: 500 });
      if (error) throw error;
      return (data || []) as { id: string; email: string; reason: string; created_at: string; metadata: any }[];
    },
  });

  return isLoading ? (
    <ListCardSkeleton rows={6} />
  ) : !data || data.length === 0 ? (
    <EmptyState icon={<Ban />} title="Ingen blokerede e-mails" description="Når en modtager bouncer, klager eller afmelder dukker de op her." />
  ) : (
    <Card className="rounded-xl border-border shadow-sm overflow-hidden">
      <div className="divide-y divide-border">
        {data.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <Ban className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{s.email}</p>
              <p className="text-xs text-muted-foreground">Årsag: {s.reason}</p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fmtTime(s.created_at)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* -------------------------------- Main -------------------------------- */
export default function PlatformMailsTab() {
  return (
    <div className="space-y-4">
      <PageHeader title="Mails" description="Leverancer, skabeloner og blokerede modtagere." />
      <Tabs defaultValue="log" className="space-y-4">
        <TabsList>
          <TabsTrigger value="log">Send-log</TabsTrigger>
          <TabsTrigger value="templates">Skabeloner</TabsTrigger>
          <TabsTrigger value="suppressed">Blokerede</TabsTrigger>
        </TabsList>
        <TabsContent value="log" className="m-0"><SendLogView /></TabsContent>
        <TabsContent value="templates" className="m-0"><TemplatesView /></TabsContent>
        <TabsContent value="suppressed" className="m-0"><SuppressedView /></TabsContent>
      </Tabs>
    </div>
  );
}