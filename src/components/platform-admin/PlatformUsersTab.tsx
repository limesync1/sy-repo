import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

const PlatformUsersTab = () => {
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, phone, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profiles.error) throw profiles.error;
      if (roles.error) throw roles.error;
      const rolesByUser: Record<string, string[]> = {};
      (roles.data || []).forEach((r: any) => {
        rolesByUser[r.user_id] = [...(rolesByUser[r.user_id] || []), r.role];
      });
      return (profiles.data || []).map((p: any) => ({ ...p, roles: rolesByUser[p.user_id] || [] }));
    },
  });

  const filtered = (data || []).filter((u: any) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return u.display_name?.toLowerCase().includes(s) || u.phone?.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg navn eller telefon..." className="pl-9" />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Indlæser brugere...</p>
      ) : filtered.length === 0 ? (
        <Card className="rounded-xl border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">Ingen brugere fundet.</CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((u: any) => (
              <div key={u.user_id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">
                  {(u.display_name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{u.display_name || "Uden navn"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.phone || "Ingen telefon"} · Tilmeldt {new Date(u.created_at).toLocaleDateString("da-DK")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {u.roles.length === 0 ? (
                    <Badge variant="outline" className="text-[10px]">user</Badge>
                  ) : (
                    u.roles.map((r: string) => (
                      <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="text-[10px]">{r}</Badge>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default PlatformUsersTab;
