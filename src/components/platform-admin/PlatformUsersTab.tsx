import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Download, Users, UserCheck, Building2, Shield, Clock, Lock, ChevronLeft, ChevronRight, ArrowUpDown, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportCsv } from "./lib/csv";
import { PageHeader, SearchInput, EmptyState, StatCard } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import UserDetailSheet, { type UserDetailUser } from "./UserDetailSheet";

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

const PAGE_SIZE = 50;
type ActivityFilter = "all" | "active_7" | "never_login" | "inactive_30" | "inactive_90" | "no_orders";
type SortKey = "created_desc" | "created_asc" | "last_login_desc" | "orders_desc" | "email_asc";

const PlatformUsersTab = () => {
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "business_owner" | "user">("all");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [sort, setSort] = useState<SortKey>("created_desc");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<UserDetailUser | null>(null);

  useEffect(() => { setPage(0); }, [q, roleFilter, activityFilter, sort]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["admin-users-v2", q, roleFilter, activityFilter, sort, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users_v2", {
        p_search: q.trim() || null,
        p_role_filter: roleFilter,
        p_activity_filter: activityFilter,
        p_sort: sort,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      return data as unknown as { total: number; rows: AdminUser[]; counts: Record<string, number> };
    },
    placeholderData: (prev) => prev,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const counts = (data?.counts ?? {}) as Record<string, number>;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Statuspille for sidste login — gør det nemt at spotte aktive vs. inaktive brugere
  const loginStatus = (iso: string | null) => {
    if (!iso) return { label: "Aldrig logget ind", tone: "bg-muted text-muted-foreground" };
    const days = (Date.now() - new Date(iso).getTime()) / 86400000;
    if (days < 1) return { label: "Aktiv i dag", tone: "bg-success/10 text-success" };
    if (days < 7) return { label: `Sidst for ${Math.round(days)} dage siden`, tone: "bg-success/10 text-success" };
    if (days < 30) return { label: `Sidst for ${Math.round(days)} dage siden`, tone: "bg-secondary text-foreground" };
    return { label: `Inaktiv i ${Math.round(days / 30)} mdr.`, tone: "bg-amber-500/10 text-amber-700" };
  };

  const handleExport = async () => {
    toast.message("Eksporterer alle matchende rækker…");
    const all: AdminUser[] = [];
    let offset = 0;
    while (true) {
      const { data: d, error } = await supabase.rpc("admin_list_users_v2", {
        p_search: q.trim() || null, p_role_filter: roleFilter, p_activity_filter: activityFilter,
        p_sort: sort, p_limit: 200, p_offset: offset,
      });
      if (error) { toast.error(error.message); return; }
      const pd = d as unknown as { total: number; rows: AdminUser[] };
      all.push(...pd.rows);
      if (all.length >= pd.total || pd.rows.length === 0) break;
      offset += 200;
      if (offset > 10000) break;
    }
    exportCsv("brugere", all.map((u) => ({
      navn: u.display_name || "", email: u.email || "", telefon: u.phone || "",
      roller: u.roles.join(", ") || "user",
      tilmeldt: new Date(u.auth_created_at).toLocaleDateString("da-DK"),
      sidst_logget_ind: u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("da-DK") : "",
      ordrer: u.orders_count, virksomheder: u.businesses_count,
    })));
  };

  const massMailFiltered = async () => {
    // Henter alle e-mails for nuværende filter og åbner mailto: med BCC.
    if (!confirm("Åbn e-mail-klient med alle matchende brugere som BCC?")) return;
    const emails: string[] = [];
    let offset = 0;
    while (true) {
      const { data: d, error } = await supabase.rpc("admin_list_users_v2", {
        p_search: q.trim() || null, p_role_filter: roleFilter, p_activity_filter: activityFilter,
        p_sort: sort, p_limit: 200, p_offset: offset,
      });
      if (error) { toast.error(error.message); return; }
      const pd = d as unknown as { total: number; rows: AdminUser[] };
      pd.rows.forEach(u => { if (u.email) emails.push(u.email); });
      if (emails.length >= pd.total || pd.rows.length === 0) break;
      offset += 200;
      if (offset > 10000) break;
    }
    if (emails.length === 0) { toast.error("Ingen e-mails fundet"); return; }
    const href = `mailto:?bcc=${encodeURIComponent(emails.join(","))}`;
    window.location.href = href;
    toast.success(`${emails.length} modtagere klar i BCC`);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Brugere"
        description={`${total} ${total === 1 ? "bruger" : "brugere"} matcher · side ${page + 1}/${totalPages}`}
        action={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 gap-1.5">
                  <ArrowUpDown className="h-3.5 w-3.5" /> Sortér
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {([
                  ["created_desc","Nyeste først"],
                  ["created_asc","Ældste først"],
                  ["last_login_desc","Senest logget ind"],
                  ["orders_desc","Flest ordrer"],
                  ["email_asc","E-mail A→Z"],
                ] as const).map(([k,l]) => (
                  <DropdownMenuItem key={k} onClick={() => setSort(k as SortKey)}>
                    {sort === k ? "✓ " : ""}{l}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" onClick={massMailFiltered} className="h-9 gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Mass-mail
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport} className="h-9 gap-1.5">
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Brugere i alt" value={String(counts.all_n ?? 0)} icon={<Users />} tone="blue" />
        <StatCard label="Aktive sidste 7 dage" value={String(counts.active_7 ?? 0)} icon={<UserCheck />} tone="emerald"
          hint={counts.all_n ? `${Math.round(((counts.active_7 ?? 0) / counts.all_n) * 100)}% af alle` : undefined} />
        <StatCard label="Virksomhedsejere" value={String(counts.owners ?? 0)} icon={<Building2 />} tone="violet" />
        <StatCard label="Admins" value={String(counts.admins ?? 0)} icon={<Shield />} tone="amber" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Søg navn, email, telefon..." />
        <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle roller</SelectItem>
            <SelectItem value="admin">Admin (kun visning)</SelectItem>
            <SelectItem value="business_owner">Virksomhedsejer</SelectItem>
            <SelectItem value="user">Kunde</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {([
          { v: "all", label: "Alle", count: counts.all_n ?? 0, tone: "default" },
          { v: "active_7", label: "Aktive ≤7d", count: counts.active_7 ?? 0, tone: "success" },
          { v: "never_login", label: "Aldrig logget ind", count: counts.never_login ?? 0, tone: "warning" },
          { v: "inactive_30", label: "Inaktive >30d", count: counts.inactive_30 ?? 0, tone: "warning" },
          { v: "inactive_90", label: "Inaktive >90d", count: counts.inactive_90 ?? 0, tone: "danger" },
          { v: "no_orders", label: "Ingen ordrer", count: counts.no_orders ?? 0, tone: "default" },
        ] as const).map((c) => {
          const active = activityFilter === c.v;
          const toneCls = active
            ? c.tone === "success" ? "bg-emerald-600 text-white border-emerald-600"
            : c.tone === "warning" ? "bg-amber-600 text-white border-amber-600"
            : c.tone === "danger"  ? "bg-destructive text-destructive-foreground border-destructive"
            : "bg-foreground text-background border-foreground"
            : "bg-background text-muted-foreground border-border hover:bg-secondary hover:text-foreground";
          return (
            <button key={c.v} onClick={() => setActivityFilter(c.v as ActivityFilter)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${toneCls}`}>
              {c.label}
              <span className={`tabular-nums text-[10px] rounded-full px-1.5 py-0.5 ${active ? "bg-background/20" : "bg-secondary text-muted-foreground"}`}>
                {c.count}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <ListCardSkeleton rows={6} />
      ) : error ? (
        <p className="text-sm text-red-600">Fejl: {(error as Error).message}</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="Ingen brugere fundet"
          description="Prøv en anden søgning eller rollefilter."
        />
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          {isFetching && (
            <div className="flex items-center gap-2 border-b border-border bg-secondary/20 px-4 py-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Henter…
            </div>
          )}
          <div className="divide-y divide-border">
            {rows.map((u) => {
              const isAdmin = u.roles.includes("admin");
              const ls = loginStatus(u.last_sign_in_at);
              return (
                <button
                  key={u.user_id}
                  type="button"
                  onClick={() => setSelected(u)}
                  className="w-full flex flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 focus-visible:bg-secondary/40 focus-visible:outline-none"
                >
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
                  <div className="flex items-center gap-1.5">
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground">
                        <Lock className="h-3 w-3" /> Admin (låst)
                      </span>
                    )}
                    {u.email && (
                      <Button
                        asChild
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9"
                        aria-label={`Email ${u.email}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a href={`mailto:${u.email}`}><Mail className="h-4 w-4" /></a>
                      </Button>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 border-t border-border bg-secondary/20 px-4 py-2 text-xs">
              <span className="text-muted-foreground">
                Viser {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} af {total}
              </span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-8 gap-1" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
                  <ChevronLeft className="h-3.5 w-3.5" /> Forrige
                </Button>
                <span className="px-2 tabular-nums">{page + 1} / {totalPages}</span>
                <Button size="sm" variant="ghost" className="h-8 gap-1" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Næste <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
      <UserDetailSheet user={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default PlatformUsersTab;
