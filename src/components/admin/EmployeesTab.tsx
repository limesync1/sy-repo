import { useState } from "react";
import {
  useEmployees, useCreateEmployee,
  useUpdateEmployee, useDeleteEmployee, useResetEmployeePassword,
} from "@/hooks/useEmployees";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Mail, Phone, Briefcase, UserPlus, X,
  Trash2, Power, PowerOff, CheckCircle2, Pencil, KeyRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROUTE_COLORS } from "@/components/route-planner/RouteEditSheet";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const linked = !!employee.user_id;
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(employee.name || "");
  const [editEmail, setEditEmail] = useState(employee.email || "");
  const [editPhone, setEditPhone] = useState(employee.phone || "");
  const [editTitle, setEditTitle] = useState(employee.title || "");
  const resetPw = useResetEmployeePassword();
  const fallbackColor = employee.color || "#64748b";
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Kun billedfiler er tilladt");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Billedet må max være 5MB");
      return;
    }
    setUploading(true);
    try {
      // RLS kræver at første mappe == auth.uid()
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Du er ikke logget ind");
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/employees/${employee.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("business-assets").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("business-assets").getPublicUrl(path);
      onUpdate.mutate(
        { id: employee.id, business_id: businessId, avatar_url: publicUrl } as any,
        { onSuccess: () => toast.success("Profilbillede opdateret") },
      );
    } catch (err: any) {
      toast.error(err.message || "Upload fejlede");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = () => {
    onUpdate.mutate(
      { id: employee.id, business_id: businessId, avatar_url: null } as any,
      { onSuccess: () => toast.success("Billede fjernet") },
    );
  };

  const handlePickColor = (color: string) => {
    onUpdate.mutate(
      { id: employee.id, business_id: businessId, color } as any,
      { onSuccess: () => toast.success("Farve opdateret") },
    );
    setPickerOpen(false);
  };

  return (
    <TooltipProvider delayDuration={200}>
    <Card className={`rounded-xl ${employee.is_active ? "" : "opacity-60"}`}>
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar / farve-prik med hover-overlay til upload */}
          <div className="relative h-10 w-10 shrink-0 group/avatar">
            {employee.avatar_url ? (
              <img
                src={employee.avatar_url}
                alt={employee.name}
                className="h-10 w-10 rounded-full object-cover border"
              />
            ) : (
              <div
                className="h-10 w-10 rounded-full border"
                style={{ background: fallbackColor }}
                aria-label={`Farve for ${employee.name}`}
              />
            )}
            <label
              className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/60 text-background text-[9px] font-semibold opacity-0 group-hover/avatar:opacity-100 cursor-pointer transition-opacity"
              title="Skift profilbillede"
            >
              {uploading ? "..." : "Skift"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
            </label>
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
            {/* Farve / billede-styring */}
            <div className="mt-1.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPickerOpen((v) => !v)}
                className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 underline-offset-2 hover:underline"
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border"
                  style={{ background: fallbackColor }}
                />
                Skift farve
              </button>
              {employee.avatar_url && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="text-[10px] text-muted-foreground hover:text-destructive underline-offset-2 hover:underline"
                >
                  Fjern billede
                </button>
              )}
            </div>
            {pickerOpen && (
              <div className="mt-2 grid grid-cols-12 gap-1 max-w-xs">
                {ROUTE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => handlePickColor(c.value)}
                    title={c.name}
                    className={cn(
                      "aspect-square rounded-md border transition-all hover:scale-110",
                      fallbackColor === c.value && "ring-2 ring-foreground",
                    )}
                    style={{ background: c.value }}
                    aria-label={c.name}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip><TooltipTrigger asChild><button
            onClick={() => {
              setEditName(employee.name || "");
              setEditEmail(employee.email || "");
              setEditPhone(employee.phone || "");
              setEditTitle(employee.title || "");
              setEditOpen(true);
            }}
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button></TooltipTrigger><TooltipContent>Rediger oplysninger</TooltipContent></Tooltip>
          {linked && (
            <Tooltip><TooltipTrigger asChild><button
              onClick={() => setConfirmReset(true)}
              disabled={resetPw.isPending}
              className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" />
            </button></TooltipTrigger><TooltipContent>Send nulstilling af adgangskode</TooltipContent></Tooltip>
          )}
          <Tooltip><TooltipTrigger asChild><button
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
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            {employee.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          </button></TooltipTrigger><TooltipContent>{employee.is_active ? "Deaktiver medarbejder" : "Aktivér medarbejder"}</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><button
            onClick={() => setConfirmDelete(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button></TooltipTrigger><TooltipContent>Slet medarbejder</TooltipContent></Tooltip>
        </div>
      </CardContent>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-accent" />
              Rediger medarbejder
            </DialogTitle>
            <DialogDescription>
              Opdater oplysninger for {employee.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Navn</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-10" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="h-10"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Email opdateres på medarbejder-profilen, men ændrer ikke login-emailen.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Telefon</label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="h-10" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">Titel</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-10" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Annuller</Button>
            <Button
              onClick={() => {
                if (!editName.trim() || !editEmail.trim()) {
                  toast.error("Navn og email er påkrævet");
                  return;
                }
                onUpdate.mutate(
                  {
                    id: employee.id,
                    business_id: businessId,
                    name: editName.trim(),
                    email: editEmail.trim().toLowerCase(),
                    phone: editPhone.trim() || null,
                    title: editTitle.trim() || null,
                  } as any,
                  {
                    onSuccess: () => {
                      toast.success("Medarbejder opdateret");
                      setEditOpen(false);
                    },
                    onError: (e: any) => toast.error(e.message || "Kunne ikke opdatere"),
                  },
                );
              }}
              disabled={onUpdate.isPending}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {onUpdate.isPending ? "Gemmer..." : "Gem ændringer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send nulstillings-email?</AlertDialogTitle>
            <AlertDialogDescription>
              Der sendes en email til <strong>{employee.email}</strong> med et link til at vælge en ny adgangskode. Den nuværende adgangskode forbliver aktiv indtil ny er valgt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annullér</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetPw.mutate(
                  { employee_id: employee.id },
                  {
                    onSuccess: ({ emailSent }) =>
                      toast.success(emailSent ? "Nulstillings-email sendt" : "Link genereret, men email kunne ikke sendes"),
                    onError: (e: any) => toast.error(e.message || "Kunne ikke sende"),
                  },
                );
              }}
            >
              Send email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slet {employee.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Medarbejderen og deres login-konto fjernes permanent. Tildelte ruter bevares, men medarbejderen kan ikke længere logge ind. Dette kan ikke fortrydes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annullér</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onRemove.mutate(
                  { id: employee.id, business_id: businessId },
                  {
                    onSuccess: () => toast.success("Medarbejder slettet"),
                    onError: (e: any) => toast.error(e.message),
                  }
                );
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Slet permanent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
    </TooltipProvider>
  );
};

export default EmployeesTab;
