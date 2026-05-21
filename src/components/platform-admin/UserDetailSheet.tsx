// UserDetailSheet — admin-detaljevisning af én bruger.
// Viser profil, roller (read-only — admin er låst), tilknyttede
// virksomheder og seneste ordrer. Handlinger (password-reset, magic-link)
// kaldes via edge function `admin-user-action` så de logges + kun admin
// kan udløse dem.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Mail, KeyRound, Send, Lock, Building2, ShoppingBag, Shield, ExternalLink, Clock, UserCheck,
} from "lucide-react";

export interface UserDetailUser {
  user_id: string;
  email: string | null;
  display_name: string | null;
  phone: string | null;
  auth_created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
}

interface Props {
  user: UserDetailUser | null;
  onClose: () => void;
}

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString("da-DK", { dateStyle: "medium", timeStyle: "short" }) : "—";

const roleLabel = (r: string) =>
  r === "admin" ? "Admin" : r === "business_owner" ? "Virksomhedsejer" : r;

const roleClass = (r: string) =>
  r === "admin" ? "bg-accent/15 text-accent border-accent/30"
  : r === "business_owner" ? "bg-violet-500/10 text-violet-700 border-violet-500/20"
  : "bg-secondary text-muted-foreground border-border";

export default function UserDetailSheet({ user, onClose }: Props) {
  const open = !!user;
  const userId = user?.user_id ?? null;
  const [sending, setSending] = useState<"reset" | "magic" | null>(null);
  const [impersonating, setImpersonating] = useState(false);

  // Virksomheder hvor brugeren er ejer
  const { data: businesses } = useQuery({
    queryKey: ["admin-user-businesses", userId],
    enabled: open && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, slug, city, deleted_at")
        .eq("owner_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Sidste 10 ordrer som kunde
  const { data: orders } = useQuery({
    queryKey: ["admin-user-orders", userId],
    enabled: open && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, total_amount, created_at, business_id")
        .eq("customer_id", userId!)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const runAction = async (kind: "reset" | "magic") => {
    if (!user?.email) {
      toast.error("Brugeren har ingen email");
      return;
    }
    setSending(kind);
    try {
      const { error } = await supabase.functions.invoke("admin-user-action", {
        body: { action: kind === "reset" ? "password_reset" : "magic_link", user_id: user.user_id },
      });
      if (error) throw error;
      toast.success(kind === "reset" ? "Password-reset sendt" : "Magic-link sendt");
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke sende");
    } finally {
      setSending(null);
    }
  };

  const impersonate = async () => {
    if (!user?.user_id) return;
    if (!confirm("Log ind som denne bruger?\n\nDu bør åbne linket i et inkognito-vindue så din admin-session ikke overskrives. Handlingen logges i audit-loggen.")) return;
    setImpersonating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-action", {
        body: { action: "impersonate", user_id: user.user_id, redirect_to: `${window.location.origin}/business-portal` },
      });
      if (error) throw error;
      const link = (data as any)?.action_link;
      if (!link) throw new Error("Ingen link returneret");
      await navigator.clipboard.writeText(link).catch(() => {});
      window.open(link, "_blank", "noopener,noreferrer");
      toast.success("Impersonations-link åbnet + kopieret. Brug helst inkognito.");
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke impersonere");
    } finally {
      setImpersonating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pr-8">
          <SheetTitle className="flex items-center gap-2">
            <span className="truncate">{user?.display_name || user?.email || "Bruger"}</span>
            {user?.roles?.map((r) => (
              <Badge key={r} className={`text-[10px] h-5 px-1.5 border ${roleClass(r)}`}>
                {roleLabel(r)}
              </Badge>
            ))}
          </SheetTitle>
          <SheetDescription className="truncate">{user?.email || "—"}</SheetDescription>
        </SheetHeader>

        {user && (
          <Tabs defaultValue="profile" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Profil</TabsTrigger>
              <TabsTrigger value="businesses">Virksomheder ({businesses?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="orders">Ordrer ({orders?.length ?? 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-3 pt-4">
              <Card className="p-4 space-y-2 text-sm">
                <Row label="Navn" value={user.display_name || "—"} />
                <Row label="Email" value={user.email || "—"} icon={<Mail className="h-3.5 w-3.5" />} />
                <Row label="Telefon" value={user.phone || "—"} />
                <Row label="Oprettet" value={fmtDate(user.auth_created_at)} />
                <Row label="Sidste login" value={fmtDate(user.last_sign_in_at)} icon={<Clock className="h-3.5 w-3.5" />} />
              </Card>

              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Shield className="h-4 w-4" /> Roller
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {user.roles.length === 0 ? (
                    <Badge variant="outline" className="text-[10px]">Kunde</Badge>
                  ) : (
                    user.roles.map((r) => (
                      <Badge key={r} className={`text-[10px] h-5 px-1.5 border ${roleClass(r)}`}>
                        {roleLabel(r)}
                      </Badge>
                    ))
                  )}
                </div>
                {user.roles.includes("admin") && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" /> Admin-rollen er låst på databaseniveau og kan ikke ændres fra UI.
                  </p>
                )}
              </Card>

              <Card className="p-4 space-y-3">
                <div className="text-sm font-semibold text-foreground">Handlinger</div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => runAction("reset")}
                    disabled={sending !== null || !user.email}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    {sending === "reset" ? "Sender..." : "Send password-reset"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => runAction("magic")}
                    disabled={sending !== null || !user.email}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {sending === "magic" ? "Sender..." : "Send magic-link"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Suspendér og slet konto kræver dobbeltbekræftelse og kommer i et senere trin.
                </p>
              </Card>
            </TabsContent>

            <TabsContent value="businesses" className="pt-4">
              {(businesses?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Ingen virksomheder.</p>
              ) : (
                <Card className="divide-y divide-border">
                  {businesses!.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 p-3 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {b.name}
                          {b.deleted_at && (
                            <Badge variant="outline" className="ml-2 text-[10px]">Slettet</Badge>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{b.city || "—"} · /{b.slug}</p>
                      </div>
                      <Button asChild size="icon" variant="ghost" className="h-8 w-8" aria-label="Åbn virksomhed">
                        <Link to={`/${b.slug}`} target="_blank"><ExternalLink className="h-3.5 w-3.5" /></Link>
                      </Button>
                    </div>
                  ))}
                </Card>
              )}
            </TabsContent>

            <TabsContent value="orders" className="pt-4">
              {(orders?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Ingen ordrer.</p>
              ) : (
                <Card className="divide-y divide-border">
                  {orders!.map((o) => (
                    <div key={o.id} className="flex items-center gap-3 p-3 text-sm">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {Number(o.total_amount || 0).toLocaleString("da-DK")} kr
                          <Badge variant="outline" className="ml-2 text-[10px]">{o.status}</Badge>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString("da-DK")}
                        </p>
                      </div>
                    </div>
                  ))}
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 text-foreground truncate">{icon}{value}</span>
    </div>
  );
}