import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useRouteTemplates, useCreateRouteTemplate, useUpdateRouteTemplate,
  useDeleteRouteTemplate, WEEKDAY_LABELS, type RouteTemplate,
} from "@/hooks/useRouteTemplates";
import { useEmployees } from "@/hooks/useEmployees";
import { ROUTE_COLORS } from "@/components/route-planner/RouteEditSheet";
import { Loader2, Plus, Trash2, Pencil, Route as RouteIcon } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  businessId: string;
};

const NONE = "__none__";

export const RouteTemplatesDialog = ({ open, onOpenChange, businessId }: Props) => {
  const { data: templates = [], isLoading } = useRouteTemplates(businessId);
  const { data: employees = [] } = useEmployees(businessId);
  const create = useCreateRouteTemplate();
  const update = useUpdateRouteTemplate();
  const remove = useDeleteRouteTemplate();

  const [editing, setEditing] = useState<RouteTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);

  const startNew = () => { setEditing(null); setShowForm(true); };
  const startEdit = (t: RouteTemplate) => { setEditing(t); setShowForm(true); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RouteIcon className="h-4 w-4" /> Rute-skabeloner
          </DialogTitle>
          <DialogDescription>
            Skabeloner gør, at en aftale automatisk havner på den rigtige rute (fx "Mandagsrute Aarhus C").
          </DialogDescription>
        </DialogHeader>

        {!showForm && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{templates.length} skabelon{templates.length === 1 ? "" : "er"}</p>
              <Button size="sm" onClick={startNew}><Plus className="h-3.5 w-3.5 mr-1" />Ny skabelon</Button>
            </div>
            <div className="space-y-2">
              {isLoading && <p className="text-sm text-muted-foreground">Henter...</p>}
              {!isLoading && templates.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">Ingen skabeloner endnu.</p>
              )}
              {templates.map((t) => {
                const emp = employees.find((e) => e.id === t.default_employee_id);
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded border p-2.5">
                    <span className="h-7 w-1.5 rounded-full" style={{ background: t.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.weekday !== null ? WEEKDAY_LABELS[t.weekday] : "Ad hoc"}
                        {" · "}{t.planned_start_time?.slice(0, 5) || "08:00"}
                        {emp ? ` · ${emp.name}` : " · ingen medarbejder"}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Slet skabelon?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Aftaler, der bruger "{t.name}", mister deres standardrute, men slettes ikke.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annullér</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove.mutate(t.id)}>Slet</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {showForm && (
          <TemplateForm
            template={editing}
            employees={employees}
            saving={create.isPending || update.isPending}
            onCancel={() => setShowForm(false)}
            onSave={async (values) => {
              if (editing) {
                await update.mutateAsync({ id: editing.id, ...values });
              } else {
                await create.mutateAsync({ business_id: businessId, ...values, name: values.name || "Ny rute" });
              }
              setShowForm(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

const TemplateForm = ({
  template, employees, saving, onCancel, onSave,
}: {
  template: RouteTemplate | null;
  employees: { id: string; name: string }[];
  saving: boolean;
  onCancel: () => void;
  onSave: (v: Partial<RouteTemplate>) => void;
}) => {
  const [name, setName] = useState(template?.name || "");
  const [weekday, setWeekday] = useState<string>(template?.weekday !== null && template?.weekday !== undefined ? String(template.weekday) : NONE);
  const [employeeId, setEmployeeId] = useState<string>(template?.default_employee_id || NONE);
  const [time, setTime] = useState(template?.planned_start_time?.slice(0, 5) || "08:00");
  const [color, setColor] = useState(template?.color || ROUTE_COLORS[0].value);
  const [active, setActive] = useState(template?.is_active ?? true);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Navn</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="fx Mandagsrute Aarhus C" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Ugedag</Label>
          <Select value={weekday} onValueChange={setWeekday}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Ad hoc (ingen fast dag)</SelectItem>
              {WEEKDAY_LABELS.map((d, i) => (
                <SelectItem key={i} value={String(i)}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Starttidspunkt</Label>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Standard-medarbejder</Label>
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger><SelectValue placeholder="Vælg" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Ingen</SelectItem>
            {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Farve</Label>
        <div className="grid grid-cols-12 gap-1.5">
          {ROUTE_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              title={c.name}
              className={`aspect-square rounded ${color === c.value ? "ring-2 ring-foreground" : ""}`}
              style={{ background: c.value }}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between rounded border p-2.5">
        <div>
          <p className="text-sm font-medium">Aktiv</p>
          <p className="text-xs text-muted-foreground">Inaktive skabeloner skjules ved aftale-oprettelse.</p>
        </div>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>Annullér</Button>
        <Button
          onClick={() => onSave({
            name: name.trim(),
            weekday: weekday === NONE ? null : Number(weekday),
            default_employee_id: employeeId === NONE ? null : employeeId,
            planned_start_time: time,
            color,
            is_active: active,
          })}
          disabled={saving || !name.trim()}
        >
          {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          Gem skabelon
        </Button>
      </div>
    </div>
  );
};