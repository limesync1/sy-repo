import { useState } from "react";
import {
  useEmployees, useCreateEmployee,
  useUpdateEmployee, useDeleteEmployee,
} from "@/hooks/useEmployees";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Mail, Phone, Briefcase, UserPlus, X,
  Trash2, Power, PowerOff, CheckCircle2,
} from "lucide-react";

interface Props {
  businessId: string;
  businessName: string;
  routePlanningEnabled: boolean;
}

const EmployeesTab = ({ businessId, routePlanningEnabled }: Props) => {
  const { data: employees, isLoading } = useEmployees(businessId);
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const remove = useDeleteEmployee();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");

  const resetForm = () => {
    setName(""); setEmail(""); setPhone(""); setTitle("");
    setShowForm(false);
  };

  const handleCreate = () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Navn og email er påkrævet");
      return;
    }
    create.mutate(
      { business_id: businessId, name, email, phone, title },
      {
        onSuccess: ({ emailSent, accountAlreadyExisted }) => {
          const base = accountAlreadyExisted
            ? "Medarbejder tilføjet (kontoen fandtes i forvejen)"
            : "Medarbejder oprettet med login";
          toast.success(
            emailSent
              ? `${base} — email sendt med oplysninger`
              : `${base} — email kunne ikke sendes`
          );
          resetForm();
        },
        onError: (e: any) => {
          toast.error(e.message || "Noget gik galt");
        },
      }
    );
  };

  if (!routePlanningEnabled) {
    return (
      <div className="max-w-3xl">
        <Card className="rounded-xl border-dashed">
          <CardContent className="p-8 text-center">
            <Briefcase className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <h3 className="text-base font-semibold text-foreground mb-1.5">
              Aktivér ruteplanlægning først
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              For at oprette medarbejder-konti skal du først aktivere
              ruteplanlægning under Indstillinger → Ruteplanlægning.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeEmployees = employees?.filter((e) => e.is_active) || [];
  const inactiveEmployees = employees?.filter((e) => !e.is_active) || [];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Medarbejdere</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tilføj medarbejdere — der oprettes automatisk en konto, og de modtager
            login-oplysninger på email.
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="h-9 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-sm font-medium px-4 shadow-sm"
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            Tilføj medarbejder
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="rounded-xl border-accent/30 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-accent" />
                Ny medarbejder
              </h3>
              <button
                onClick={resetForm}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Navn *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Anders Jensen"
                  className="h-10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Email *
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="anders@example.dk"
                  className="h-10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Telefon
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="12 34 56 78"
                  className="h-10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Titel / rolle
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Chauffør, rengøringsmedarbejder…"
                  className="h-10"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Der genereres automatisk en sikker adgangskode, og medarbejderen
              modtager en email med login-oplysninger og link til medarbejder-appen.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={resetForm} className="h-9 text-sm">
                Annuller
              </Button>
              <Button
                onClick={handleCreate}
                disabled={create.isPending}
                className="h-9 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 text-sm font-semibold px-5"
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                {create.isPending ? "Opretter..." : "Opret medarbejder"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Indlæser…</p>}

      {/* Active Employees */}
      {activeEmployees.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Aktive ({activeEmployees.length})
          </h3>
          <div className="space-y-2">
            {activeEmployees.map((emp) => (
              <EmployeeRow
                key={emp.id}
                employee={emp}
                businessId={businessId}
                onUpdate={update}
                onRemove={remove}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive Employees */}
      {inactiveEmployees.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Deaktiverede ({inactiveEmployees.length})
          </h3>
          <div className="space-y-2">
            {inactiveEmployees.map((emp) => (
              <EmployeeRow
                key={emp.id}
                employee={emp}
                businessId={businessId}
                onUpdate={update}
                onRemove={remove}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (employees?.length === 0) && !showForm && (
        <Card className="rounded-xl border-dashed">
          <CardContent className="p-8 text-center">
            <UserPlus className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <h3 className="text-base font-semibold text-foreground mb-1.5">
              Ingen medarbejdere endnu
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Tilføj din første medarbejder — de modtager en email med deres
              login-oplysninger og adgang til ruteplanlæggeren.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="h-9 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-sm font-medium px-4"
            >
              <UserPlus className="mr-1.5 h-4 w-4" />
              Tilføj første medarbejder
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const EmployeeRow = ({
  employee, businessId, onUpdate, onRemove,
}: {
  employee: any;
  businessId: string;
  onUpdate: ReturnType<typeof useUpdateEmployee>;
  onRemove: ReturnType<typeof useDeleteEmployee>;
}) => {
  const initials = employee.name
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const linked = !!employee.user_id;

  return (
    <Card className={`rounded-xl ${employee.is_active ? "" : "opacity-60"}`}>
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent text-sm font-semibold">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-foreground truncate">{employee.name}</p>
              {linked && (
                <Badge variant="outline" className="h-5 text-[10px] gap-1 border-emerald-500/30 text-emerald-700 bg-emerald-50">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Konto aktiv
                </Badge>
              )}
              {employee.title && (
                <span className="text-xs text-muted-foreground">· {employee.title}</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                {employee.email}
              </span>
              {employee.phone && (
                <span className="flex items-center gap-1 truncate">
                  <Phone className="h-3 w-3 shrink-0" />
                  {employee.phone}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              onUpdate.mutate(
                { id: employee.id, business_id: businessId, is_active: !employee.is_active },
                {
                  onSuccess: () =>
                    toast.success(employee.is_active ? "Medarbejder deaktiveret" : "Medarbejder aktiveret"),
                  onError: (e: any) => toast.error(e.message),
                }
              );
            }}
            title={employee.is_active ? "Deaktiver" : "Aktiver"}
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            {employee.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          </button>
          <button
            onClick={() => {
              if (!confirm(`Slet ${employee.name}? Dette kan ikke fortrydes.`)) return;
              onRemove.mutate(
                { id: employee.id, business_id: businessId },
                {
                  onSuccess: () => toast.success("Medarbejder slettet"),
                  onError: (e: any) => toast.error(e.message),
                }
              );
            }}
            title="Slet"
            className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeesTab;
