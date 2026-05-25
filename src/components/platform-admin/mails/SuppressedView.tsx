import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { Ban, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { fmtTime } from "./shared";
import { useAdaptivePageSize } from "@/hooks/useAdaptivePageSize";
import { PaginationFooter } from "@/components/admin/shared/PaginationFooter";

export function SuppressedView() {
  const qc = useQueryClient();
  const pageSize = useAdaptivePageSize();
  const [page, setPage] = useState(0);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-suppressed-emails"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_suppressed_emails" as any, { p_limit: 500 });
      if (error) throw error;
      return (data || []) as { id: string; email: string; reason: string; created_at: string; metadata: any }[];
    },
  });

  const total = data?.length ?? 0;
  useEffect(() => { setPage(0); }, [total]);
  const paged = useMemo(
    () => (data ?? []).slice(page * pageSize, (page + 1) * pageSize),
    [data, page, pageSize],
  );

  const unblock = useMutation({
    mutationFn: async (row: { id: string; email: string }) => {
      const { error } = await supabase.rpc("admin_unsuppress_email" as any, { p_id: row.id });
      if (error) throw error;
      return row;
    },
    onSuccess: (row) => {
      toast.success(`${row.email} er afblokeret`);
      qc.invalidateQueries({ queryKey: ["admin-suppressed-emails"] });
    },
    onError: (e: any) => toast.error("Kunne ikke afblokere", { description: e.message }),
  });

  return isLoading ? (
    <ListCardSkeleton rows={6} />
  ) : !data || data.length === 0 ? (
    <EmptyState icon={<Ban />} title="Ingen blokerede e-mails" description="Når en modtager bouncer, klager eller afmelder dukker de op her." />
  ) : (
    <div className="space-y-3">
    <Card className="rounded-xl border-border shadow-sm overflow-hidden">
      <div className="divide-y divide-border">
        {paged.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              <Ban className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{s.email}</p>
              <p className="text-xs text-muted-foreground">Årsag: {s.reason}</p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fmtTime(s.created_at)}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm(`Afblokér ${s.email}? Mails vil derefter blive sendt til denne adresse igen.`)) {
                  unblock.mutate({ id: s.id, email: s.email });
                }
              }}
              disabled={unblock.isPending}
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
              Afblokér
            </Button>
          </div>
        ))}
      </div>
    </Card>
      <PaginationFooter page={page} pageSize={pageSize} total={total} onPageChange={setPage} label="blokerede mails" />
    </div>
  );
}