import { useMemo, useState } from "react";
import { BellRing, Loader2, Mail, Send } from "lucide-react";
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
  const [sending, setSending] = useState<"notice" | "email" | null>(null);

  const sendNotice = async () => {
    if (!employeeId || !message.trim()) return;
    setSending("notice");
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
      setSending(null);
    }
  };

  const sendOverview = async () => {
    if (!employeeId) return;
    setSending("email");
    try {
      const { data, error } = await supabase.functions.invoke("route-overview-email", {
        body: { routeId: route.id, employeeId },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success(data?.sent === false ? "Medarbejderen har fravalgt app-mails" : "Planen er sendt");
    } catch (error: any) {
      toast.error("Kunne ikke sende planen", { description: error?.message });
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <BellRing className="h-4 w-4 text-accent" />
        <div>
          <p className="text-sm font-semibold">Kontakt medarbejder</p>
          <p className="text-xs text-muted-foreground">Én medarbejder ad gangen</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Medarbejder</Label>
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger className="h-10"><SelectValue placeholder="Vælg medarbejder" /></SelectTrigger>
          <SelectContent>
            {choices.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Textarea
        value={message}
        onChange={(event) => setMessage(event.target.value.slice(0, 500))}
        placeholder={stop ? `Besked om ${stop.customer_name || "aftalen"}` : "Skriv en kort besked om ruten"}
        rows={3}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button className="gap-2" onClick={sendNotice} disabled={!employeeId || !message.trim() || !!sending}>
          {sending === "notice" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send notifikation
        </Button>
        <Button variant="outline" className="gap-2" onClick={sendOverview} disabled={!employeeId || !!sending}>
          {sending === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Send plan på mail
        </Button>
      </div>
    </div>
  );
}