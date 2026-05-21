import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCog, Mail, Users, KeyRound, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface Props {
  business: any;
  ownerEmail?: string | null;
  employees: any[] | undefined;
}

export default function UsersPanel({ business, ownerEmail, employees }: Props) {
  const [impersonating, setImpersonating] = useState(false);

  return (
    <div className="space-y-3 mt-4">
      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <UserCog className="h-4 w-4" /> Ejer
        </h3>
        {ownerEmail ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{ownerEmail}</p>
              <p className="text-xs text-muted-foreground">Virksomhedsejer</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button asChild size="sm" variant="outline" aria-label={`Send mail til ${ownerEmail}`}>
                <a href={`mailto:${ownerEmail}`}><Mail className="h-3.5 w-3.5 mr-1.5" />Mail</a>
              </Button>
              <Button
                size="sm" variant="outline"
                className="border-amber-500/30 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800"
                disabled={impersonating || !business?.owner_id}
                onClick={async () => {
                  if (!business?.owner_id) return;
                  if (!confirm("Log ind som ejeren?\n\nBrug helst inkognito så din admin-session bevares. Handlingen logges i audit-loggen.")) return;
                  setImpersonating(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("admin-user-action", {
                      body: { action: "impersonate", user_id: business.owner_id, redirect_to: `${window.location.origin}/business-portal` },
                    });
                    if (error) throw error;
                    const link = (data as any)?.action_link;
                    if (!link) throw new Error("Ingen link returneret");
                    await navigator.clipboard.writeText(link).catch(() => {});
                    window.open(link, "_blank", "noopener,noreferrer");
                    toast.success("Link åbnet + kopieret. Brug inkognito.");
                  } catch (e: any) {
                    toast.error(e?.message || "Kunne ikke impersonere");
                  } finally {
                    setImpersonating(false);
                  }
                }}
              >
                <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                {impersonating ? "Henter…" : "Log ind som ejer"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Ingen ejer fundet.</p>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" /> Medarbejdere
            <span className="text-xs font-normal text-muted-foreground">({employees?.length ?? 0})</span>
          </h3>
        </div>
        {!employees?.length ? (
          <p className="text-xs text-muted-foreground">Ingen medarbejdere oprettet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {employees.map((e: any) => (
              <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="truncate text-sm font-medium text-foreground">{e.name || "Uden navn"}</p>
                    {!e.is_active && (
                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">Inaktiv</span>
                    )}
                    {e.user_id && (
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Login</span>
                    )}
                    {e.livechat_enabled && (
                      <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">Livechat</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {[e.title, e.email, e.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                {e.email && (
                  <Button asChild size="sm" variant="ghost" className="h-9 w-9 p-0" aria-label={`Mail ${e.email}`}>
                    <a href={`mailto:${e.email}`}><Mail className="h-3.5 w-3.5" /></a>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground/80">
          <KeyRound className="inline h-3 w-3 mr-1" />
          Adgangskode-reset og suspendering kommer i næste opdatering — brug indtil videre admin-impersonation.
        </p>
      </Card>
    </div>
  );
}