import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Section } from "./SheetSection";

/** Noter og ydelsesændringer sendt fra medarbejdere for en aftale. */
export function EmployeeNotesSection({ orderId }: { orderId: string }) {
  const qc = useQueryClient();
  const { data: notes = [] } = useQuery({
    queryKey: ["business-employee-notes", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_appointment_notes")
        .select("id, body, kind, created_at, read_at, employee_id")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const ids = [...new Set((data || []).map((n) => n.employee_id).filter(Boolean))] as string[];
      const { data: emps } = ids.length
        ? await supabase.from("employees").select("id, name").in("id", ids)
        : { data: [] as any[] };
      const names = new Map((emps || []).map((e: any) => [e.id, e.name]));
      return (data || []).map((n) => ({ ...n, employee_name: names.get(n.employee_id) })) as any[];
    },
  });

  const unread = notes.filter((n) => !n.read_at).map((n) => n.id);
  useEffect(() => {
    if (!unread.length) return;
    supabase.from("employee_appointment_notes").update({ read_at: new Date().toISOString() }).in("id", unread)
      .then(() => qc.invalidateQueries({ queryKey: ["business-employee-notes", orderId] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread.join(",")]);

  if (!notes.length) return null;
  return (
    <Section icon={<MessageSquare className="h-3.5 w-3.5" />} title="Fra medarbejdere" hint={`${notes.length}`}>
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded-md border border-border bg-card p-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">{n.employee_name || "Medarbejder"}</span>
              <span>{format(new Date(n.created_at), "d. MMM HH:mm", { locale: da })}</span>
              {n.kind === "services_changed" && <Badge variant="outline" className="h-4 px-1.5 text-[10px]">Ydelser ændret</Badge>}
              {n.kind === "obstacle" && <Badge variant="outline" className="h-4 border-warning/50 bg-warning/10 px-1.5 text-[10px] text-warning-foreground">Skal omplanlægges</Badge>}
              {!n.read_at && <Badge className="h-4 px-1.5 text-[10px]">Ny</Badge>}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{n.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
