import { useEffect, useMemo, useState } from "react";
import { BellRing, Loader2, Send, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeeAvatar as SharedEmployeeAvatar } from "@/components/shared/EmployeeAvatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Route, RouteStop } from "@/hooks/useRoutes";
import { toast } from "sonner";
import { Section } from "./SheetSection";

type Employee = {
  id: string;
  name: string;
  email?: string | null;
  is_active?: boolean | null;
  avatar_url?: string | null;
  color?: string | null;
};

const EmployeeAvatar = ({ employee, className }: { employee: Employee; className?: string }) => (
  <SharedEmployeeAvatar employee={employee} size={28} className={className} />
);

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
  // Kun medarbejdere der faktisk er på rutens aftaler kan kontaktes.
  const choices = assigned;
  const [employeeId, setEmployeeId] = useState(choices[0]?.id ?? "");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!choices.some((c) => c.id === employeeId)) setEmployeeId(choices[0]?.id ?? "");
  }, [choices, employeeId]);
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

  const selectedEmployee = choices.find((employee) => employee.id === employeeId);

  // Ingen medarbejder på ruten → intet at kontakte.
  if (choices.length === 0) return null;

  return (
    <Section
      icon={<BellRing className="h-3.5 w-3.5" />}
      title="Kontakt medarbejder"
      hint={stop ? "Vises på aftalen" : "Vises på ruten"}
    >
      <div className="space-y-3">
        {choices.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-md border border-dashed border-border bg-secondary/30 px-3 py-3 text-xs text-muted-foreground">
            <UsersRound className="h-4 w-4 shrink-0" />
            Ingen aktive medarbejdere kan modtage beskeden.
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-foreground">Medarbejder</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="h-11 w-full bg-background sm:h-10">
                    <SelectValue placeholder="Vælg medarbejder">
                      {selectedEmployee ? (
                        <span className="flex min-w-0 items-center gap-2 text-left">
                          <EmployeeAvatar employee={selectedEmployee} className="h-7 w-7 shrink-0" />
                          <span className="min-w-0 truncate">{selectedEmployee.name}</span>
                        </span>
                      ) : null}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {choices.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <span className="flex items-center gap-2">
                        <EmployeeAvatar employee={employee} className="h-7 w-7 shrink-0" />
                        <span className="min-w-0 truncate">{employee.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label className="min-w-0 truncate text-[11px] font-semibold text-foreground">Besked til {selectedEmployee?.name || "medarbejderen"}</Label>
                <span className="text-[10px] tabular-nums text-muted-foreground">{message.length}/500</span>
              </div>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value.slice(0, 500))}
                placeholder={stop ? `Skriv om ${stop.customer_name || "aftalen"}` : "Skriv en kort besked om ruten"}
                rows={3}
                className="min-h-[76px] resize-none bg-background"
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" className="h-11 w-full gap-2 sm:h-9 sm:w-auto sm:min-w-32" onClick={sendNotice} disabled={!message.trim() || sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send besked
              </Button>
            </div>
          </>
        )}
      </div>
    </Section>
  );
}