import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldOff, Mail, Download, Users, UserCheck, Building2, Shield, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportCsv } from "./lib/csv";
import { PageHeader, SearchInput, EmptyState, StatCard } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";

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
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "business_owner" | "user">("all");

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users-rich"] }); toast.success("Rolle opdateret"); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return (data || []).filter((u) => {
      if (roleFilter !== "all") {
        if (roleFilter === "user") { if (u.roles.length > 0) return false; }
        else if (!u.roles.includes(roleFilter)) return false;
      }
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return u.display_name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.phone?.toLowerCase().includes(s);
    });
  }, [data, q, roleFilter]);

  // Aggregerede statistikker — giver admin et hurtigt overblik øverst
  // (samme mønster som "Overblik" og "Virksomheder").
  const stats = useMemo(() => {
    const list = data || [];
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      total: list.length,
      admins: list.filter((u) => u.roles.includes("admin")).length,
      owners: list.filter((u) => u.roles.includes("business_owner")).length,
      activeWeek: list.filter((u) => u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() > sevenDaysAgo).length,
    };
  }, [data]);

  // Statuspille for sidste login — gør det nemt at spotte aktive vs. inaktive brugere
  const loginStatus = (iso: string | null) => {
    if (!iso) return { label: "Aldrig logget ind", tone: "bg-muted text-muted-foreground" };
    const days = (Date.now() - new Date(iso).getTime()) / 86400000;
    if (days < 1) return { label: "Aktiv i dag", tone: "bg-success/10 text-success" };
    if (days < 7) return { label: `Sidst for ${Math.round(days)} dage siden`, tone: "bg-success/10 text-success" };
    if (days < 30) return { label: `Sidst for ${Math.round(days)} dage siden`, tone: "bg-secondary text-foreground" };
    return { label: `Inaktiv i ${Math.round(days / 30)} mdr.`, tone: "bg-amber-500/10 text-amber-700" };
  };

  const handleExport = () => {
    exportCsv("brugere", filtered.map((u) => ({
      navn: u.display_name || "", email: u.email || "", telefon: u.phone || "",
      roller: u.roles.join(", ") || "user",
      tilmeldt: new Date(u.auth_created_at).toLocaleDateString("da-DK"),
      sidst_logget_ind: u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("da-DK") : "",
      ordrer: u.orders_count, virksomheder: u.businesses_count,
    })));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Brugere"
        description={`${filtered.length} ${filtered.length === 1 ? "bruger" : "brugere"} matcher`}
        action={
          <Button size="sm" variant="outline" onClick={handleExport} className="h-9 gap-1.5">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Brugere i alt" value={String(stats.total)} icon={<Users />} tone="blue" />
        <StatCard label="Aktive sidste 7 dage" value={String(stats.activeWeek)} icon={<UserCheck />} tone="emerald"
          hint={stats.total ? `${Math.round((stats.activeWeek / stats.total) * 100)}% af alle` : undefined} />
        <StatCard label="Virksomhedsejere" value={String(stats.owners)} icon={<Building2 />} tone="violet" />
        <StatCard label="Admins" value={String(stats.admins)} icon={<Shield />} tone="amber" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Søg navn, email, telefon..." />
        <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
          <SelectTrigger className="w-[180px] h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle roller</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="business_owner">Virksomhedsejer</SelectItem>
            <SelectItem value="user">Kunde</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ListCardSkeleton rows={6} />
      ) : error ? (
        <p className="text-sm text-red-600">Fejl: {(error as Error).message}</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="Ingen brugere fundet"
          description="Prøv en anden søgning eller rollefilter."
        />
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((u) => {
              const isAdmin = u.roles.includes("admin");
              const ls = loginStatus(u.last_sign_in_at);
              return (
                <div key={u.user_id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-secondary/30">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">
                    {(u.display_name || u.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="truncate text-sm font-semibold text-foreground">{u.display_name || "Uden navn"}</p>
                      {u.roles.length === 0 ? (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">Kunde</Badge>
                      ) : (
                        u.roles.map((r) => (
                          <Badge key={r} className={`text-[10px] h-5 px-1.5 border ${roleColor(r)}`}>
                            {r === "admin" ? "Admin" : r === "business_owner" ? "Virksomhed" : r}
                          </Badge>
                        ))
                      )}
                      <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${ls.tone}`}>
                        <Clock className="h-2.5 w-2.5" />{ls.label}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />{u.email || "—"}
                      {u.phone && <span> · {u.phone}</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      Tilmeldt {new Date(u.auth_created_at).toLocaleDateString("da-DK")} · {Number(u.orders_count)} ordrer · {Number(u.businesses_count)} virksomheder
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {u.email && (
                      <a href={`mailto:${u.email}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Email">
                        <Mail className="h-3.5 w-3.5" />
                      </a>
                    )}
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
