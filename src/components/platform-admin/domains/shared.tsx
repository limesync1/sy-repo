import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, Lock } from "lucide-react";

export const LOVABLE_PROJECT_DOMAINS_URL =
  "https://lovable.dev/projects/3396f095-cb5d-439d-8707-af0033c7fb66/settings/domains";

export type DomainRow = {
  id: string; name: string; slug: string; domain: string;
  status: "active" | "pending_activation" | "pending_dns" | "pending_ownership" | "failed" | "unknown";
  dns_verified_at: string | null;
  activated_at: string | null;
  last_checked_at: string | null;
  email: string | null;
  ssl: SslInfo | null;
  settings: Record<string, unknown>;
};

export type SslInfo = {
  checked_at: string;
  status: "ok" | "not_found" | string;
  issuer?: string;
  not_before?: string;
  not_after?: string;
};

export const STATUS_LABEL: Record<DomainRow["status"], { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  active: { label: "Live", className: "bg-success/10 text-success border-success/30", Icon: CheckCircle2 },
  pending_activation: { label: "Klar til aktivering", className: "bg-blue-500/10 text-blue-600 border-blue-500/30", Icon: Clock },
  pending_dns: { label: "DNS mangler (pegning)", className: "bg-amber-500/10 text-amber-600 border-amber-500/30", Icon: AlertCircle },
  pending_ownership: { label: "Mangler ejerskab (TXT)", className: "bg-muted text-muted-foreground border-border", Icon: AlertCircle },
  failed: { label: "Fejlede", className: "bg-destructive/10 text-destructive border-destructive/30", Icon: AlertCircle },
  unknown: { label: "Ukendt", className: "bg-muted text-muted-foreground border-border", Icon: AlertCircle },
};

export const renderSslBadge = (ssl: SslInfo | null) => {
  if (!ssl) {
    return <Badge variant="outline" className="bg-muted text-muted-foreground border-border"><Lock className="mr-1 h-3 w-3" /> SSL ikke tjekket</Badge>;
  }
  if (ssl.status !== "ok" || !ssl.not_after) {
    return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30"><Lock className="mr-1 h-3 w-3" /> Intet cert fundet</Badge>;
  }
  const days = Math.floor((new Date(ssl.not_after).getTime() - Date.now()) / 86_400_000);
  const isExpired = days < 0;
  const isCritical = days >= 0 && days <= 14;
  const cls = isExpired ? "bg-destructive/10 text-destructive border-destructive/30"
    : isCritical ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
    : "bg-success/10 text-success border-success/30";
  const label = isExpired ? "Udløbet" : days === 0 ? "Udløber i dag" : `Udløber om ${days} d`;
  return (
    <Badge variant="outline" className={cls}
      title={`Udsteder: ${ssl.issuer || "?"}\nGyldig til: ${new Date(ssl.not_after).toLocaleString("da-DK")}\nTjekket: ${new Date(ssl.checked_at).toLocaleString("da-DK")}`}>
      <Lock className="mr-1 h-3 w-3" /> {label}
    </Badge>
  );
};