import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ShieldCheck, ShieldOff, Mail } from "lucide-react";
import { toast } from "sonner";

interface AdminUser {
  user_id: string;
  email: string | null;
  auth_created_at: string;
  last_sign_in_at: string | null;
  display_name: string | null;
  phone: string | null;
  roles: string[];
  orders_count: number;
  businesses_count: number;
}

const roleColor = (role: string) =>
  role === "admin" ? "bg-accent/15 text-accent border-accent/30" :
  role === "business_owner" ? "bg-violet-500/10 text-violet-700 border-violet-500/20" :
  "bg-secondary text-muted-foreground border-border";

const PlatformUsersTab = () => {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users-rich"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return (data || []) as AdminUser[];
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role, grant }: { userId: string; role: "admin" | "business_owner" | "user"; grant: boolean }) => {
      const { error } = await supabase.rpc("admin_set_user_role", { _user_id: userId, _role: role, _grant: grant });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users-rich"] });
      toast.success("Rolle opdateret");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (data || []).filter((u) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return u.display_name?.toLowerCase().includes(s) ||
           u.email?.toLowerCase().includes(s) ||
           u.phone?.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg navn, email, telefon..." className="pl-9" />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Indlæser brugere...</p>
      ) : error ? (
        <p className="text-sm text-red-600">Fejl: {(error as Error).message}</p>
      ) : filtered.length === 0 ? (
        <Card className="rounded-xl border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">Ingen brugere fundet.</CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((u) => {
              const isAdmin = u.roles.includes("admin");
              return (
                <div key={u.user_id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-secondary/30">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">
                    {(u.display_name || u.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="truncate text-sm font-semibold text-foreground">{u.display_name || "Uden navn"}</p>
                      {u.roles.length === 0 ? (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">user</Badge>
                      ) : (
                        u.roles.map((r) => (
                          <Badge key={r} className={`text-[10px] h-5 px-1.5 border ${roleColor(r)}`}>{r}</Badge>
                        ))
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />{u.email || "—"}
                      {u.phone && <span> · {u.phone}</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      Tilmeldt {new Date(u.auth_created_at).toLocaleDateString("da-DK")} ·
                      {u.last_sign_in_at ? ` Sidst logget ind ${new Date(u.last_sign_in_at).toLocaleDateString("da-DK")}` : " Aldrig logget ind"} ·
                      {Number(u.orders_count)} ordrer · {Number(u.businesses_count)} virksomheder
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-8 gap-1.5"
                      onClick={() => setRole.mutate({ userId: u.user_id, role: "admin", grant: !isAdmin })}>
                      {isAdmin ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{isAdmin ? "Fjern admin" : "Gør admin"}</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default PlatformUsersTab;
