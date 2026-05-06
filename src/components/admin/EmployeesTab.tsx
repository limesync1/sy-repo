import { useState, useMemo } from "react";
import {
  useEmployees, useCreateEmployee,
  useUpdateEmployee, useDeleteEmployee, useResetEmployeePassword,
} from "@/hooks/useEmployees";
import { useEmployeeEarnings } from "@/hooks/useEmployeeEarnings";
import { formatKr } from "@/lib/commission";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Mail, Phone, Briefcase, UserPlus, X,
  Trash2, Power, PowerOff, Pencil, KeyRound, Users, Percent, MessageCircle,
  Wallet, TrendingUp, ListChecks, MapPin, CheckCircle2, Clock, CalendarDays,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROUTE_COLORS } from "@/components/route-planner/RouteEditSheet";
import { cn } from "@/lib/utils";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear,
  subMonths, format,
} from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader, PrimaryButton, FieldLabel, SectionCard, EmptyState, SearchInput } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";

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
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [employeeGroup, setEmployeeGroup] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "linked" | "pending">("all");

  // Indtjenings-periode (i dag, denne uge, denne måned, seneste 6 mdr, YTD, alt)
  type RangeKey = "today" | "week" | "month" | "6m" | "ytd" | "all";
  const [earnRange, setEarnRange] = useState<RangeKey>("month");
  const { from, to } = useMemo(() => {
    const t = new Date();
    const fmt = (d: Date) => format(d, "yyyy-MM-dd");
    switch (earnRange) {
      case "today":  return { from: fmt(t), to: fmt(t) };
      case "week":   return { from: fmt(startOfWeek(t, { weekStartsOn: 1 })), to: fmt(endOfWeek(t, { weekStartsOn: 1 })) };
      case "month":  return { from: fmt(startOfMonth(t)), to: fmt(endOfMonth(t)) };
      case "6m":     return { from: fmt(subMonths(t, 6)), to: fmt(t) };
      case "ytd":    return { from: fmt(startOfYear(t)), to: fmt(endOfYear(t)) };
      case "all":
      default:       return { from: "2000-01-01", to: fmt(t) };
    }
  }, [earnRange]);
  const RANGE_LABELS: Record<RangeKey, string> = {
    today: "I dag", week: "Denne uge", month: "Denne måned",
    "6m": "Seneste 6 mdr", ytd: "I år", all: "I alt",
  };
  const { data: earningsMap } = useEmployeeEarnings(businessId, from, to);

  const resetForm = () => {
    setName(""); setEmail(""); setPhone(""); setTitle(""); setCommissionPct("");
    setEmployeeNumber(""); setEmployeeGroup("");
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
      {
        business_id: businessId, name, email, phone, title,
        commission_pct: pctNum,
        employee_number: employeeNumber,
        employee_group: employeeGroup,
      },
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
          <PrimaryButton data-tour="employees-create-button" onClick={() => setShowForm(true)} icon={<UserPlus />}>
            Tilføj medarbejder
          </PrimaryButton>
        ) : null}
      />

      {/* Stats + filter — samme layout som Kunder/Aftaler */}
      <div data-tour="employees-stats" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
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
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Udbetalt provision · {RANGE_LABELS[earnRange]}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-2xl font-semibold tabular-nums text-foreground">
                <Wallet className="h-5 w-5 text-muted-foreground" />
                {formatKr(
                  earningsMap
                    ? Array.from(earningsMap.values()).reduce((s, e) => s + e.earnings, 0)
                    : 0,
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Beregnet ekskl. moms</p>
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

      {/* Periode-vælger til indtjening */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" />
          Vis indtjening for:
        </div>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setEarnRange(k)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                earnRange === k
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {RANGE_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Søgefelt */}
      <div data-tour="employees-search" className="flex items-center gap-2 flex-wrap">
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
              <div>
                <FieldLabel>Medarbejder-nr.</FieldLabel>
                <Input
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  placeholder="Auto"
                  className="h-10"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Bruges når lønsystemet (fx Zenegy) er forbundet.
                </p>
              </div>
              <div>
                <FieldLabel>Medarbejdergruppe / afdeling</FieldLabel>
                <Input
                  value={employeeGroup}
                  onChange={(e) => setEmployeeGroup(e.target.value)}
                  placeholder="fx Service Øst"
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
              <PrimaryButton onClick={handleCreate} disabled={create.isPending} icon={<UserPlus />}>
                {create.isPending ? "Opretter..." : "Opret medarbejder"}
              </PrimaryButton>
            </div>
        </SectionCard>
      )}

      {isLoading && <ListCardSkeleton rows={4} />}

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
              <div className="grid items-center gap-4 border-b border-border px-4 py-3 sm:px-5 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_13rem]">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">Aktive medarbejdere</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {filteredActive.length} {filteredActive.length === 1 ? "medarbejder" : "medarbejdere"}
                  </p>
                </div>
                {/* Kolonne-titler — bruger samme grid-template som rækken
                    (1fr · 8rem · 8rem · 13rem) så overskrifter står lodret
                    over de faktiske kolonner i hver række. */}
                <span className="hidden sm:block text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
                <span className="hidden sm:block text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Indtjening</span>
                <span className="hidden sm:block text-right pr-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Handlinger</span>
              </div>
              <div className="divide-y divide-border">
                {filteredActive.map((emp) => (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    businessId={businessId}
                    onUpdate={update}
                    onRemove={remove}
                    earning={earningsMap?.get(emp.id) ?? null}
                    rangeLabel={RANGE_LABELS[earnRange]}
                  />
                ))}
              </div>
            </Card>
          )}

          {filteredInactive.length > 0 && (
            <Card className="surface-admin rounded-xl border-border/80 shadow-sm overflow-hidden">
              <div className="grid items-center gap-4 border-b border-border px-4 py-3 sm:px-5 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_13rem]">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">Deaktiverede</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {filteredInactive.length} {filteredInactive.length === 1 ? "medarbejder" : "medarbejdere"}
                  </p>
                </div>
                <span className="hidden sm:block text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
                <span className="hidden sm:block text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Indtjening</span>
                <span className="hidden sm:block text-right pr-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Handlinger</span>
              </div>
              <div className="divide-y divide-border">
                {filteredInactive.map((emp) => (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    businessId={businessId}
                    onUpdate={update}
                    onRemove={remove}
                    earning={earningsMap?.get(emp.id) ?? null}
                    rangeLabel={RANGE_LABELS[earnRange]}
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
  employee, businessId, onUpdate, onRemove, earning, rangeLabel,
}: {
  employee: any;
  businessId: string;
  onUpdate: ReturnType<typeof useUpdateEmployee>;
  onRemove: ReturnType<typeof useDeleteEmployee>;
  earning: { earnings: number; stopsCompleted: number; revenue: number } | null;
  rangeLabel: string;
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
  const [editLivechat, setEditLivechat] = useState<boolean>(!!(employee as any).livechat_enabled);
  const [editEmployeeNumber, setEditEmployeeNumber] = useState<string>((employee as any).employee_number || "");
  const [editEmployeeGroup, setEditEmployeeGroup] = useState<string>((employee as any).employee_group || "");
  const [tasksOpen, setTasksOpen] = useState(false);
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
      className={`group grid w-full gap-4 px-4 py-3 transition-colors hover:bg-secondary/60 sm:px-5
                  sm:grid-cols-[minmax(0,1fr)_8rem_8rem_13rem] sm:items-center
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
               loading="lazy" decoding="async"/>
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
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-muted-foreground min-w-0">
              <span className="flex min-w-0 max-w-full items-center gap-1">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{employee.email}</span>
              </span>
              {employee.phone && (
                <span className="flex min-w-0 items-center gap-1">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span className="truncate">{employee.phone}</span>
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

        {/* Kontostatus — viser altid en status så kolonnen ikke står tom.
            Aktiv (grøn) · Afventer login (gul) · Deaktiveret (grå). */}
        <div className="hidden sm:flex flex-col items-end justify-center gap-1 text-right">
          {!employee.is_active ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
              Deaktiveret
            </span>
          ) : !linked ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Afventer login
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Aktiv
            </span>
          )}
          {(employee as any).livechat_enabled && (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
              <MessageCircle className="h-2.5 w-2.5" />
              Livechat
            </span>
          )}
        </div>

        {/* Indtjening for valgt periode */}
        <div className="hidden sm:flex flex-col items-end justify-center text-right">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {formatKr(earning?.earnings ?? 0)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {earning?.stopsCompleted ?? 0} {earning?.stopsCompleted === 1 ? "opgave" : "opgaver"}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <div className="text-xs">
                <p className="font-medium">Provision · {rangeLabel}</p>
                <p className="mt-1 text-muted-foreground">
                  {Number(employee.commission_pct || 0)}% af beløb ekskl. moms.
                </p>
                {earning && earning.revenue > 0 && (
                  <p className="mt-0.5 text-muted-foreground tabular-nums">
                    Omsætning: {formatKr(earning.revenue)} (inkl. moms)
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Handlinger — samme stil som kunder-rækken */}
        <div className="flex items-center justify-end gap-1 shrink-0">
          <Tooltip><TooltipTrigger asChild><button
            onClick={() => {
              setEditName(employee.name || "");
              setEditEmail(employee.email || "");
              setEditPhone(employee.phone || "");
              setEditTitle(employee.title || "");
              setEditCommission(employee.commission_pct != null ? String(employee.commission_pct) : "0");
              setEditLivechat(!!(employee as any).livechat_enabled);
              setEditOpen(true);
            }}
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Pencil className="h-4 w-4" />
          </button></TooltipTrigger><TooltipContent>Rediger oplysninger</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><button
            onClick={() => {
              const next = !(employee as any).livechat_enabled;
              onUpdate.mutate(
                { id: employee.id, business_id: businessId, livechat_enabled: next } as any,
                {
                  onSuccess: () =>
                    toast.success(next ? "Livechat-adgang aktiveret" : "Livechat-adgang fjernet"),
                  onError: (e: any) => toast.error(e.message),
                },
              );
            }}
            className={cn(
              "rounded-md p-2 transition-colors",
              (employee as any).livechat_enabled
                ? "bg-accent/10 text-accent hover:bg-accent/15"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <MessageCircle className="h-4 w-4" />
          </button></TooltipTrigger><TooltipContent>{(employee as any).livechat_enabled ? "Fjern livechat-adgang" : "Giv adgang til livechat"}</TooltipContent></Tooltip>
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
        <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
          {/* Header med avatar — skaber visuel kontekst, så man med det samme
              ved hvilken medarbejder man redigerer. */}
          <div className="flex items-center gap-3 border-b border-border bg-secondary/40 px-5 py-4">
            {employee.avatar_url ? (
              <img
                src={employee.avatar_url}
                alt=""
                className="h-11 w-11 rounded-full object-cover border border-border shrink-0"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div
                className="h-11 w-11 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
                style={{ backgroundColor: fallbackColor }}
              >
                {(employee.name || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <DialogHeader className="space-y-0.5 text-left">
                <DialogTitle className="text-base font-semibold text-foreground truncate">
                  Rediger {employee.name || "medarbejder"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Opdater kontaktoplysninger, rolle, provision og adgange.
                </DialogDescription>
              </DialogHeader>
            </div>
            <span
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                linked
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-border bg-background text-muted-foreground",
              )}
              title={linked ? "Medarbejderen har en aktiv login-konto" : "Medarbejderen er ikke koblet til en login-konto"}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", linked ? "bg-emerald-500" : "bg-muted-foreground/40")} />
              {linked ? "Login aktiv" : "Uden login"}
            </span>
          </div>

          {/* Sektioner — grupperet for at gøre det nemt at scanne */}
          <div className="max-h-[70vh] overflow-y-auto px-5 py-5 space-y-5">
            {/* Kontakt */}
            <section>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Kontaktoplysninger
              </h4>
              <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <FieldLabel required>Navn</FieldLabel>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-10" />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel required>Email</FieldLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="h-10 pl-9"
                      placeholder="navn@eksempel.dk"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Bruges til kommunikation. Login-emailen ændres ikke automatisk.
                  </p>
                </div>
                <div>
                  <FieldLabel>Telefon</FieldLabel>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="h-10 pl-9"
                      placeholder="+45 12 34 56 78"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Titel</FieldLabel>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-10 pl-9"
                      placeholder="F.eks. Rengøringsassistent"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Medarbejder-nr.</FieldLabel>
                  <Input
                    value={editEmployeeNumber}
                    onChange={(e) => setEditEmployeeNumber(e.target.value)}
                    className="h-10"
                    placeholder="Auto"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Bruges til synkronisering med lønsystem.
                  </p>
                </div>
                <div>
                  <FieldLabel>Medarbejdergruppe / afdeling</FieldLabel>
                  <Input
                    value={editEmployeeGroup}
                    onChange={(e) => setEditEmployeeGroup(e.target.value)}
                    className="h-10"
                    placeholder="fx Service Øst"
                  />
                </div>
              </div>
            </section>

            {/* Provision */}
            <section>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Aflønning
              </h4>
              <div className="rounded-xl border border-border bg-card p-4">
                <FieldLabel>Provision af udførte opgaver</FieldLabel>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step="0.5"
                      value={editCommission}
                      onChange={(e) => setEditCommission(e.target.value)}
                      className="h-10 pr-9"
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">af omsætningen</span>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Sæt til <strong className="font-semibold text-foreground">0</strong> hvis medarbejderen er på fast løn. Eksempel: 15 betyder at medarbejderen optjener 15 % af omsætningen for de opgaver de udfører.
                </p>
              </div>
            </section>

            {/* Adgang */}
            <section>
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Adgange
              </h4>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                  editLivechat
                    ? "border-accent/40 bg-accent/5"
                    : "border-border bg-card hover:bg-secondary/40",
                )}
              >
                <input
                  type="checkbox"
                  checked={editLivechat}
                  onChange={(e) => setEditLivechat(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent"
                />
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <MessageCircle className="h-3.5 w-3.5 text-accent" />
                    Adgang til livechat
                  </span>
                  <span className="mt-1 block text-[11px] text-muted-foreground leading-relaxed">
                    Når aktiveret kan medarbejderen besvare livechat-henvendelser fra kunder i deres eget medarbejderpanel.
                  </span>
                </span>
              </label>
            </section>
          </div>

          <DialogFooter className="gap-2 border-t border-border bg-secondary/30 px-5 py-3">
            <Button variant="ghost" onClick={() => setEditOpen(false)} className="h-9">Annuller</Button>
            <PrimaryButton
              onClick={() => {
                if (!editName.trim() || !editEmail.trim()) {
                  toast.error("Navn og email er påkrævet");
                  return;
                }
                const pctNum = editCommission.trim() === "" ? 0 : Number(editCommission.replace(",", "."));
                if (Number.isNaN(pctNum) || pctNum < 0 || pctNum > 100) {
                  toast.error("Provision skal være et tal mellem 0 og 100");
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
                    commission_pct: pctNum,
                    livechat_enabled: editLivechat,
                    employee_number: editEmployeeNumber.trim() || null,
                    employee_group: editEmployeeGroup.trim() || null,
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
              icon={<Pencil />}
            >
              {onUpdate.isPending ? "Gemmer..." : "Gem ændringer"}
            </PrimaryButton>
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
