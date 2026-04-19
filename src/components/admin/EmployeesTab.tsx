import { useState } from "react";
import {
  useEmployees, useEmployeeInvitations,
  useInviteEmployee, useResendInvitation,
  useUpdateEmployee, useDeleteEmployee,
} from "@/hooks/useEmployees";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, Mail, Phone, Briefcase, UserPlus, X,
  Send, Trash2, Power, PowerOff, Clock, CheckCircle2,
} from "lucide-react";

interface Props {
  businessId: string;
  businessName: string;
  routePlanningEnabled: boolean;
}

const EmployeesTab = ({ businessId, businessName, routePlanningEnabled }: Props) => {
  const { data: employees, isLoading } = useEmployees(businessId);
  const { data: invitations } = useEmployeeInvitations(businessId);
  const invite = useInviteEmployee();
  const resend = useResendInvitation();
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

  const handleInvite = () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Navn og email er påkrævet");
      return;
    }
    invite.mutate(
      { business_id: businessId, business_name: businessName, name, email, phone, title },
      {
        onSuccess: ({ emailSent }) => {
          toast.success(
            emailSent
              ? "Medarbejder oprettet og invitation sendt"
              : "Medarbejder oprettet — kunne ikke sende email, prøv 'Send igen'"
          );
          resetForm();
        },
        onError: (e: any) => {
          if (e.message?.includes("duplicate") || e.code === "23505") {
            toast.error("Denne medarbejder er allerede oprettet");
          } else {
            toast.error(e.message || "Noget gik galt");
          }
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
  const pendingInvitations = invitations || [];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Medarbejdere</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Inviter medarbejdere — de får adgang til en personlig app med dagens ruter.
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="h-9 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-sm font-medium px-4 shadow-sm"
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            Inviter medarbejder
          </Button>
        )}
      </div>

      {/* Invite Form */}
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
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={resetForm} className="h-9 text-sm">
                Annuller
              </Button>
              <Button
                onClick={handleInvite}
                disabled={invite.isPending}
                className="h-9 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 text-sm font-semibold px-5"
              >
                <Send className="mr-1.5 h-4 w-4" />
                {invite.isPending ? "Sender..." : "Send invitation"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Indlæser…</p>}

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Afventer accept ({pendingInvitations.length})
          </h3>
          <div className="space-y-2">
            {pendingInvitations.map((inv) => {
              const employee = employees?.find((e) => e.id === inv.employee_id);
              const expired = new Date(inv.expires_at) < new Date();
              return (
                <Card key={inv.id} className="rounded-xl border-amber-500/30 bg-amber-50/30">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {employee?.name || inv.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {inv.email} · {expired ? "Udløbet" : `Udløber ${new Date(inv.expires_at).toLocaleDateString("da-DK")}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resend.isPending}
                      onClick={() => {
                        if (!employee) return;
                        resend.mutate(
                          {
                            invitation_id: inv.id,
                            business_id: businessId,
                            business_name: businessName,
                            employee_name: employee.name,
                            email: inv.email,
                          },
                          {
                            onSuccess: () => toast.success("Invitation sendt igen"),
                            onError: (e: any) => toast.error(e.message),
                          }
                        );
                      }}
                      className="h-8 text-xs shrink-0"
                    >
                      <Send className="mr-1 h-3 w-3" />
                      Send igen
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

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
      {!isLoading && (employees?.length === 0) && pendingInvitations.length === 0 && !showForm && (
        <Card className="rounded-xl border-dashed">
          <CardContent className="p-8 text-center">
            <UserPlus className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <h3 className="text-base font-semibold text-foreground mb-1.5">
              Ingen medarbejdere endnu
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Inviter dine første medarbejdere — de får en email med et link til
              at oprette deres konto og adgang til ruteplanlæggeren.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="h-9 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-sm font-medium px-4"
            >
              <UserPlus className="mr-1.5 h-4 w-4" />
              Inviter første medarbejder
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
              {linked ? (
                <Badge variant="outline" className="h-5 text-[10px] gap-1 border-emerald-500/30 text-emerald-700 bg-emerald-50">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Konto aktiv
                </Badge>
              ) : (
                <Badge variant="outline" className="h-5 text-[10px] border-amber-500/30 text-amber-700 bg-amber-50">
                  Konto ikke oprettet
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
