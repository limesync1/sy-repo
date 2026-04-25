import { useState, useMemo } from "react";
import {
  useEmployees, useCreateEmployee,
  useUpdateEmployee, useDeleteEmployee, useResetEmployeePassword,
} from "@/hooks/useEmployees";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Mail, Phone, Briefcase, UserPlus, X,
  Trash2, Power, PowerOff, Pencil, KeyRound, Users, Percent,
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
import { PageHeader, PrimaryButton, FieldLabel, SectionCard, EmptyState, SearchInput } from "@/components/admin/shared/AdminUI";

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
  const [commissionPct, setCommissionPct] = useState<string>("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "linked" | "pending">("all");

  const resetForm = () => {
    setName(""); setEmail(""); setPhone(""); setTitle(""); setCommissionPct("");
    setShowForm(false);
  };

  const handleCreate = () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Navn og email er påkrævet");
      return;
    }
    const pctNum = commissionPct.trim() === "" ? 0 : Number(commissionPct.replace(",", "."));
    if (Number.isNaN(pctNum) || pctNum < 0 || pctNum > 100) {
      toast.error("Provision skal være et tal mellem 0 og 100");
      return;
    }
    create.mutate(
      { business_id: businessId, name, email, phone, title, commission_pct: pctNum },
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

  // Hooks skal kaldes før early return — derfor beregner vi filtered her,
  // og bruger employees direkte i deps så det er stabilt.
  const all = employees || [];
  const activeEmployees = all.filter((e) => e.is_active);
  const inactiveEmployees = all.filter((e) => !e.is_active);
  const linkedCount = all.filter((e) => !!e.user_id).length;
  const pendingCount = all.filter((e) => !e.user_id).length;

  const filtered = useMemo(() => {
    let list = employees || [];
    if (statusFilter === "active")   list = list.filter((e) => e.is_active);
    if (statusFilter === "inactive") list = list.filter((e) => !e.is_active);
    if (statusFilter === "linked")   list = list.filter((e) => !!e.user_id);
    if (statusFilter === "pending")  list = list.filter((e) => !e.user_id);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((e) =>
      (e.name || "").toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q) ||
      (e.phone || "").toLowerCase().includes(q) ||
      (e.title || "").toLowerCase().includes(q),
    );
  }, [employees, search, statusFilter]);

  const filteredActive = filtered.filter((e) => e.is_active);
  const filteredInactive = filtered.filter((e) => !e.is_active);

  if (!routePlanningEnabled) {
    return (
      <div className="max-w-3xl space-y-6">
        <PageHeader
          title="Medarbejdere"
          description="Tilføj medarbejdere — der oprettes automatisk en konto, og de modtager login-oplysninger på email."
        />
        <EmptyState
          icon={<Briefcase />}
          title="Aktivér ruteplanlægning først"
          description="For at oprette medarbejder-konti skal du først aktivere ruteplanlægning under Indstillinger → Ruteplanlægning."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Medarbejdere"
        description="Tilføj medarbejdere — der oprettes automatisk en konto, og de modtager login-oplysninger på email."
        action={!showForm ? (
          <PrimaryButton onClick={() => setShowForm(true)} icon={<UserPlus />}>
            Tilføj medarbejder
          </PrimaryButton>
        ) : null}
      />

      {/* Stats + filter — samme layout som Kunder/Aftaler */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Medarbejdere i alt</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{all.length}</p>
            </CardContent>
          </Card>
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Aktive</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{activeEmployees.length}</p>
            </CardContent>
          </Card>
          <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Konto aktiveret</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{linkedCount}</p>
              {pendingCount > 0 && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">{pendingCount} afventer login</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {[
            { key: "all", label: "Alle", count: all.length },
            { key: "active", label: "Aktive", count: activeEmployees.length },
            { key: "inactive", label: "Deaktiverede", count: inactiveEmployees.length },
            ...(pendingCount > 0 ? [{ key: "pending", label: "Afventer login", count: pendingCount }] : []),
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key as any)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                statusFilter === key
                  ? "border-border bg-secondary text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {label}
              {count > 0 && <span className="ml-1.5 tabular-nums">{count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Søgefelt */}
      <div className="flex items-center gap-2 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Søg navn, email, telefon eller titel..." />
      </div>

      {/* Create Form */}
      {showForm && (
        <SectionCard
          title={<><UserPlus /> Ny medarbejder</>}
          action={
            <button onClick={resetForm} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          }
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel required>Navn</FieldLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Anders Jensen"
                  className="h-10"
                />
              </div>
              <div>
                <FieldLabel required>Email</FieldLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="anders@example.dk"
                  className="h-10"
                />
              </div>
              <div>
                <FieldLabel>Telefon</FieldLabel>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="12 34 56 78"
                  className="h-10"
                />
              </div>
              <div>
                <FieldLabel>Titel / rolle</FieldLabel>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Chauffør, rengøringsmedarbejder…"
                  className="h-10"
                />
              </div>
              <div>
                <FieldLabel>Provision (%)</FieldLabel>
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step="0.5"
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(e.target.value)}
                    placeholder="fx 10"
                    className="h-10 pr-9"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Andel af omsætningen for udførte opgaver. Lad være tom for 0 %.
                </p>
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
              <PrimaryButton onClick={handleCreate} disabled={create.isPending} icon={<UserPlus />}>
                {create.isPending ? "Opretter..." : "Opret medarbejder"}
              </PrimaryButton>
            </div>
        </SectionCard>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Indlæser…</p>}

      {/* Liste — ét stort kort med header-bar og rækker adskilt af divide-y, ligesom Kunder. */}
      {!isLoading && all.length === 0 && !showForm ? (
        <EmptyState
          icon={<UserPlus />}
          title="Ingen medarbejdere endnu"
          description="Tilføj din første medarbejder — de modtager en email med deres login-oplysninger og adgang til ruteplanlæggeren."
          action={
            <PrimaryButton onClick={() => setShowForm(true)} icon={<UserPlus />}>
              Tilføj første medarbejder
            </PrimaryButton>
          }
        />
      ) : !isLoading && filtered.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="Ingen medarbejdere matcher"
          description="Prøv et andet søgeord eller skift filter."
        />
      ) : !isLoading ? (
        <div className="space-y-3">
          {filteredActive.length > 0 && (
            <Card className="surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">Aktive medarbejdere</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {filteredActive.length} {filteredActive.length === 1 ? "medarbejder" : "medarbejdere"}
                  </p>
                </div>
                {/* Kolonne-titler — matcher bredder i hver række */}
                <div className="hidden sm:flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="w-28 text-right">Kontostatus</span>
                  <span className="w-[136px] text-right pr-2">Handlinger</span>
                </div>
              </div>
              <div className="divide-y divide-border">
                {filteredActive.map((emp) => (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    businessId={businessId}
                    onUpdate={update}
                    onRemove={remove}
                  />
                ))}
              </div>
            </Card>
          )}

          {filteredInactive.length > 0 && (
            <Card className="surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">Deaktiverede</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {filteredInactive.length} {filteredInactive.length === 1 ? "medarbejder" : "medarbejdere"}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="w-28 text-right">Kontostatus</span>
                  <span className="w-[136px] text-right pr-2">Handlinger</span>
                </div>
              </div>
              <div className="divide-y divide-border">
                {filteredInactive.map((emp) => (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    businessId={businessId}
                    onUpdate={update}
                    onRemove={remove}
                  />
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : null}
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
  const [editCommission, setEditCommission] = useState<string>(
    employee.commission_pct != null ? String(employee.commission_pct) : "0",
  );
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
    <div
      className={`group grid w-full gap-3 px-4 py-3 transition-colors hover:bg-secondary/60 sm:px-5
                  sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center
                  ${employee.is_active ? "" : "opacity-60"}`}
    >
        {/* Navn + kontakt + farve-styring (venstre kolonne) */}
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
              {Number(employee.commission_pct) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-foreground tabular-nums">
                  <Percent className="h-2.5 w-2.5" />
                  {Number(employee.commission_pct)}% provision
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

        {/* Kontostatus-kolonne — matcher kunder-kolonnerne (right-aligned, fast bredde) */}
        <div className="hidden sm:flex w-28 items-center justify-end">
          {linked ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Konto aktiv
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Afventer
            </span>
          )}
        </div>

        {/* Handlinger — samme stil som kunder-rækken */}
        <div className="flex items-center justify-end gap-0.5 shrink-0 sm:w-[136px]">
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
    </div>
    </TooltipProvider>
  );
};

export default EmployeesTab;
