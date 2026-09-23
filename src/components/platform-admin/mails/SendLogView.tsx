import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SearchInput, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { Mail, MailX, Ban, RefreshCw, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { STATUS_LABEL, STATUS_TONE, RANGES, fmtTime } from "./shared";
import { useAdaptivePageSize } from "@/hooks/useAdaptivePageSize";
import { PaginationFooter } from "@/components/admin/shared/PaginationFooter";

export function SendLogView() {
  const [q, setQ] = useState("");
  const [template, setTemplate] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [range, setRange] = useState<string>("7d");
  const [openRow, setOpenRow] = useState<any | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const pageSize = useAdaptivePageSize();
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [q, template, status, range]);

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

  const resend = async (row: any) => {
    if (!row?.recipient_email || !row?.template_name) return;
    if (!confirm(`Send "${row.template_name}" igen til ${row.recipient_email}?`)) return;
    setResendingId(row.message_id);
    try {
      const templateData = row.metadata?.templateData ?? row.metadata?.template_data ?? {};
      const { data, error } = await supabase.functions.invoke("admin-preview-template", {
        body: {
          action: "send",
          templateName: row.template_name,
          recipientEmail: row.recipient_email,
          idempotencyKey: `admin-resend-${row.message_id}-${Date.now()}`,
          templateData,
        },
      });
      if (error || !data?.sent) throw error || new Error("Modtageren kan ikke kontaktes");
      toast.success(`Gen-sendt til ${row.recipient_email}`);
      refetch();
    } catch (e: any) {
      toast.error("Kunne ikke gen-sende", { description: e.message });
    } finally {
      setResendingId(null);
    }
  };

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

  const total = rows?.length ?? 0;
  const paged = useMemo(
    () => (rows ?? []).slice(page * pageSize, (page + 1) * pageSize),
    [rows, page, pageSize],
  );

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
            {paged.map((r) => (
              <div key={r.message_id} className="flex w-full items-start gap-3 px-4 py-3 transition-colors hover:bg-secondary/30">
                <button onClick={() => setOpenRow(r)} className="flex flex-1 items-start gap-3 text-left min-w-0">
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => resend(r)}
                  disabled={resendingId === r.message_id}
                  title="Gen-send denne e-mail"
                >
                  <RotateCw className={cn("h-3.5 w-3.5", resendingId === r.message_id && "animate-spin")} />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
      <PaginationFooter page={page} pageSize={pageSize} total={total} onPageChange={setPage} label="mails" />

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