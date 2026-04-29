import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle2, Clock, AlertCircle, ExternalLink, Globe, Copy, Loader2, Rocket } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";

// Lovable-projektet hvor custom-domæner skal tilføjes. Når admin klikker
// "Tilføj til Lovable" kopierer vi domænet og åbner Lovable's
// domæne-indstillinger i en ny fane, så det kun er ét klik + ét paste.
const LOVABLE_PROJECT_DOMAINS_URL =
  "https://lovable.dev/projects/3396f095-cb5d-439d-8707-af0033c7fb66/settings/domains";

type DomainRow = {
  id: string;
  name: string;
  slug: string;
  domain: string;
  status: "active" | "pending_activation" | "pending_dns" | "pending_ownership" | "failed" | "unknown";
  dns_verified_at: string | null;
  activated_at: string | null;
  last_checked_at: string | null;
  email: string | null;
  settings: Record<string, unknown>;
};

const STATUS_LABEL: Record<DomainRow["status"], { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  active: { label: "Live", className: "bg-success/10 text-success border-success/30", Icon: CheckCircle2 },
  pending_activation: { label: "Klar til aktivering", className: "bg-blue-500/10 text-blue-600 border-blue-500/30", Icon: Clock },
  pending_dns: { label: "DNS mangler (pegning)", className: "bg-amber-500/10 text-amber-600 border-amber-500/30", Icon: AlertCircle },
  pending_ownership: { label: "Mangler ejerskab (TXT)", className: "bg-muted text-muted-foreground border-border", Icon: AlertCircle },
  failed: { label: "Fejlede", className: "bg-destructive/10 text-destructive border-destructive/30", Icon: AlertCircle },
  unknown: { label: "Ukendt", className: "bg-muted text-muted-foreground border-border", Icon: AlertCircle },
};

const PlatformDomainsTab = () => {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending_activation" | "active" | "issues">("pending_activation");

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-domains"],
    queryFn: async (): Promise<DomainRow[]> => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, slug, email, settings")
        .order("name");
      if (error) throw error;
      return (data || [])
        .map((b: any) => {
          const s = (b.settings || {}) as Record<string, any>;
          const domain = String(s.custom_domain || "").trim();
          if (!domain) return null;
          return {
            id: b.id,
            name: b.name,
            slug: b.slug,
            email: b.email,
            domain,
            status: (s.custom_domain_status as DomainRow["status"]) || "unknown",
            dns_verified_at: (s.custom_domain_dns_verified_at as string) || null,
            activated_at: (s.custom_domain_verified_at as string) || null,
            last_checked_at: (s.custom_domain_last_checked_at as string) || null,
            settings: s,
          } as DomainRow;
        })
        .filter((x): x is DomainRow => !!x)
        .sort((a, b) => {
          // Pending activation først (kø-prioritet)
          const order = { pending_activation: 0, pending_dns: 1, pending_ownership: 2, failed: 3, active: 4, unknown: 5 };
          return (order[a.status] ?? 9) - (order[b.status] ?? 9);
        });
    },
  });

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (filter === "all") return rows;
    if (filter === "active") return rows.filter((r) => r.status === "active");
    if (filter === "pending_activation") return rows.filter((r) => r.status === "pending_activation");
    if (filter === "issues") return rows.filter((r) => ["pending_dns", "pending_ownership", "failed"].includes(r.status));
    return rows;
  }, [rows, filter]);

  const counts = useMemo(() => {
    const c = { all: rows?.length || 0, pending_activation: 0, active: 0, issues: 0 };
    rows?.forEach((r) => {
      if (r.status === "pending_activation") c.pending_activation++;
      else if (r.status === "active") c.active++;
      else if (["pending_dns", "pending_ownership", "failed"].includes(r.status)) c.issues++;
    });
    return c;
  }, [rows]);

  const setActive = useMutation({
    mutationFn: async ({ row, active }: { row: DomainRow; active: boolean }) => {
      const newSettings = {
        ...row.settings,
        custom_domain_status: active ? "active" : "pending_activation",
        custom_domain_verified_at: active ? new Date().toISOString() : null,
      };
      const { error } = await supabase
        .from("businesses")
        .update({ settings: newSettings })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.active ? "Domænet er markeret som aktivt" : "Sat tilbage i kø");
      qc.invalidateQueries({ queryKey: ["admin-domains"] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke opdatere"),
  });

  const recheck = useMutation({
    mutationFn: async (row: DomainRow) => {
      const { error } = await supabase.functions.invoke("verify-custom-domain", {
        body: { business_id: row.id, domain: row.domain },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("DNS gen-tjekket");
      qc.invalidateQueries({ queryKey: ["admin-domains"] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke tjekke DNS"),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Custom domæner"
        description="Kø af kunders egne domæner. DNS verificeres automatisk — du markerer manuelt når domænet er tilføjet på hosting-platformen og SSL er udstedt."
      />

      <div className="flex flex-wrap gap-2">
        {[
          { key: "pending_activation" as const, label: `Kø til aktivering (${counts.pending_activation})` },
          { key: "active" as const, label: `Live (${counts.active})` },
          { key: "issues" as const, label: `DNS-problemer (${counts.issues})` },
          { key: "all" as const, label: `Alle (${counts.all})` },
        ].map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <ListCardSkeleton rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Globe />} title="Ingen domæner i denne kategori" description="Kunders custom domæner vises her når de tilføjer dem i deres virksomhedsindstillinger." />
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => {
            const meta = STATUS_LABEL[row.status] || STATUS_LABEL.unknown;
            return (
              <Card key={row.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{row.domain}</span>
                      <Badge variant="outline" className={meta.className}>
                        <meta.Icon className="mr-1 h-3 w-3" /> {meta.label}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.name} · <span className="font-mono">/v/{row.slug}</span>
                      {row.email && <> · <a href={`mailto:${row.email}`} className="underline">{row.email}</a></>}
                    </p>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {row.dns_verified_at && <>DNS OK siden: {new Date(row.dns_verified_at).toLocaleString("da-DK")}. </>}
                      {row.activated_at && <>Aktiveret: {new Date(row.activated_at).toLocaleString("da-DK")}. </>}
                      {row.last_checked_at && <>Sidst tjekket: {new Date(row.last_checked_at).toLocaleString("da-DK")}.</>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(row.domain);
                        toast.success("Domæne kopieret");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => recheck.mutate(row)} disabled={recheck.isPending}>
                      {recheck.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Re-tjek DNS"}
                    </Button>
                    {row.status === "active" ? (
                      <Button size="sm" variant="outline" onClick={() => setActive.mutate({ row, active: false })} disabled={setActive.isPending}>
                        Deaktiver
                      </Button>
                    ) : row.status === "pending_activation" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try { await navigator.clipboard.writeText(row.domain); } catch {}
                            toast.success("Domænet er kopieret — indsæt det i Lovable og klik 'Connect Domain'");
                            window.open(LOVABLE_PROJECT_DOMAINS_URL, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <Rocket className="mr-1 h-3.5 w-3.5" /> Tilføj til Lovable
                        </Button>
                        <Button size="sm" onClick={() => setActive.mutate({ row, active: true })} disabled={setActive.isPending}>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Markér som aktivt
                        </Button>
                      </>
                    ) : null}
                    <a
                      href={`https://${row.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted"
                    >
                      <ExternalLink className="h-3 w-3" /> Test
                    </a>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PlatformDomainsTab;