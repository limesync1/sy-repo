import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mail, Download, Users, UserCheck, Building2, Shield, ChevronLeft, ChevronRight, ArrowUpDown, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportCsv } from "./lib/csv";
import { PageHeader, EmptyState, StatCard } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import UserDetailSheet, { type UserDetailUser } from "./UserDetailSheet";
import { PAGE_SIZE, ActivityFilter, SortKey, SORT_LABELS, AdminUser } from "./users/shared";
import UserRow from "./users/UserRow";
import UsersFilters from "./users/UsersFilters";

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

  const fetchAllMatching = async (): Promise<AdminUser[] | null> => {
    const all: AdminUser[] = [];
    let offset = 0;
    while (true) {
      const { data: d, error } = await supabase.rpc("admin_list_users_v2", {
        p_search: q.trim() || null, p_role_filter: roleFilter, p_activity_filter: activityFilter,
        p_sort: sort, p_limit: 200, p_offset: offset,
      });
      if (error) { toast.error(error.message); return null; }
      const pd = d as unknown as { total: number; rows: AdminUser[] };
      all.push(...pd.rows);
      if (all.length >= pd.total || pd.rows.length === 0) break;
      offset += 200;
      if (offset > 10000) break;
    }
    return all;
  };

  const handleExport = async () => {
    toast.message("Eksporterer alle matchende rækker…");
    const all = await fetchAllMatching();
    if (!all) return;
    exportCsv("brugere", all.map((u) => ({
      navn: u.display_name || "", email: u.email || "", telefon: u.phone || "",
      roller: u.roles.join(", ") || "user",
      tilmeldt: new Date(u.auth_created_at).toLocaleDateString("da-DK"),
      sidst_logget_ind: u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("da-DK") : "",
      ordrer: u.orders_count, virksomheder: u.businesses_count,
    })));
  };

  const massMailFiltered = async () => {
    if (!confirm("Åbn e-mail-klient med alle matchende brugere som BCC?")) return;
    const all = await fetchAllMatching();
    if (!all) return;
    const emails = all.map(u => u.email).filter(Boolean) as string[];
    if (emails.length === 0) { toast.error("Ingen e-mails fundet"); return; }
    window.location.href = `mailto:?bcc=${encodeURIComponent(emails.join(","))}`;
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
                {SORT_LABELS.map(([k, l]) => (
                  <DropdownMenuItem key={k} onClick={() => setSort(k)}>
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

      <UsersFilters
        q={q} setQ={setQ}
        roleFilter={roleFilter} setRoleFilter={setRoleFilter}
        activityFilter={activityFilter} setActivityFilter={setActivityFilter}
        counts={counts}
      />

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
            {rows.map((u) => <UserRow key={u.user_id} user={u} onOpen={setSelected} />)}
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