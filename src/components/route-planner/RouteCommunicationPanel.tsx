import { useMemo, useState } from "react";
import { BellRing, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Route, RouteStop } from "@/hooks/useRoutes";
import { toast } from "sonner";

type Employee = { id: string; name: string; email?: string | null; is_active?: boolean | null };

export function RouteCommunicationPanel({
  route,
  stops,
  employees,
  stop,
}: {
  route: Route;
  stops: RouteStop[];
  employees: Employee[];
  stop?: RouteStop | null;
}) {
  const assigned = useMemo(() => {
    const ids = new Set(stops.flatMap((item) => item.assignee_ids?.length ? item.assignee_ids : [item.assigned_employee_id]).filter(Boolean));
    return employees.filter((employee) => employee.is_active !== false && ids.has(employee.id));
  }, [employees, stops]);
  const choices = assigned.length ? assigned : employees.filter((employee) => employee.is_active !== false);
  const [employeeId, setEmployeeId] = useState(choices[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const sendNotice = async () => {
    if (!employeeId || !message.trim()) return;
    setSending(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Du skal være logget ind");
      const { error } = await supabase.from("employee_route_notifications").insert({
        business_id: route.business_id,
        employee_id: employeeId,
        route_id: route.id,
        route_stop_id: stop?.id ?? null,
        sender_user_id: auth.user.id,
        message: message.trim(),
      });
      if (error) throw error;
      setMessage("");
      toast.success("Notifikation sendt");
    } catch (error: any) {
      toast.error("Kunne ikke sende notifikationen", { description: error?.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-2.5 rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] bg-accent/10 text-accent">
          <BellRing className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Kontakt medarbejder</p>
          <p className="truncate text-[11px] text-muted-foreground">Beskeden markeres på den valgte rute eller aftale</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <div className="space-y-1">
        <Label className="text-[11px]">Modtager</Label>
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Vælg medarbejder" /></SelectTrigger>
          <SelectContent>
            {choices.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>)}
          </SelectContent>
        </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Besked</Label>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, 500))}
            placeholder={stop ? `Besked om ${stop.customer_name || "aftalen"}` : "Skriv en kort besked om ruten"}
            rows={2}
            className="min-h-[58px] resize-none"
          />
        </div>
      </div>
      <Button size="sm" className="h-9 w-full gap-2" onClick={sendNotice} disabled={!employeeId || !message.trim() || sending}>
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send besked
      </Button>
    </div>
  );
}