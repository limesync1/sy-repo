// BusinessDetailSheet — komplet kontrolpanel for en enkelt virksomhed.
// Samler alle admin-handlinger ét sted: prøveperiode, plan, ejer,
// soft/hard-delete. Bruger admin_* RPC'er fra migrationen, som logger
// til admin_audit_log og kun kan kaldes af admins (has_role).
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Building2, CalendarClock, RefreshCw, Zap, ShieldCheck, UserCog,
  Trash2, AlertTriangle, ExternalLink, CreditCard, Clock,
  Mail, MapPin, CheckCircle2, XCircle, Archive, Users, KeyRound, UserCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  businessId: string | null;
  onClose: () => void;
}

const fmtKr = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;
const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("da-DK", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function BusinessDetailSheet({ businessId, onClose }: Props) {
  const qc = useQueryClient();
  const [extendDays, setExtendDays] = useState("14");
  const [forceNote, setForceNote] = useState("");
  const [transferEmail, setTransferEmail] = useState("");
  const [confirmHardDelete, setConfirmHardDelete] = useState(false);
  const [hardDeleteName, setHardDeleteName] = useState("");
  const [impersonating, setImpersonating] = useState(false);

  const { data: business } = useQuery({
    queryKey: ["admin-business-detail", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses").select("*").eq("id", businessId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: plan } = useQuery({
    queryKey: ["admin-business-plan-detail", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_plans").select("*").eq("business_id", businessId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: owner } = useQuery({
    queryKey: ["admin-business-owner", business?.owner_id],
    enabled: !!business?.owner_id,
    queryFn: async () => {
      const { data } = await supabase.rpc("admin_business_stats");
      const row = (data || []).find((r: any) => r.business_id === businessId);
      return row ? { email: row.owner_email } : null;
    },
  });

  const { data: auditLog } = useQuery({
    queryKey: ["admin-audit-business", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("*")
        .eq("target_type", "business")
        .eq("target_id", businessId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  // Medarbejdere på virksomheden — vises i Brugere-fanen så admin nemt kan
  // se hvem der har adgang og fx sende password-reset.
  const { data: employees } = useQuery({
    queryKey: ["admin-business-employees", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id,name,email,phone,title,is_active,user_id,livechat_enabled,created_at")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-business-detail", businessId] });
    qc.invalidateQueries({ queryKey: ["admin-business-plan-detail", businessId] });
    qc.invalidateQueries({ queryKey: ["admin-audit-business", businessId] });
    qc.invalidateQueries({ queryKey: ["admin-businesses"] });
    qc.invalidateQueries({ queryKey: ["admin-business-plans"] });
  };

  const rpc = useMutation({
    mutationFn: async ({ fn, args, successMsg }: { fn: string; args: any; successMsg: string }) => {
      const { data, error } = await supabase.rpc(fn as any, args);
      if (error) throw error;
      return { data, successMsg };
    },
    onSuccess: (r) => {
      toast.success(r.successMsg);
      invalidateAll();
    },
    onError: (e: any) => toast.error(e.message || "Handlingen fejlede"),
  });

  const trialEnd = plan?.trial_ends_at ? new Date(plan.trial_ends_at) : null;
  const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - Date.now()) / 86400000) : null;
  const hasCard = !!plan?.stripe_payment_method_last4;
  const isDeleted = !!business?.deleted_at;

  return (
    <Sheet open={!!businessId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {business?.name || "Indlæser…"}
            {isDeleted && (
              <span className="text-xs font-normal rounded-md bg-destructive/10 text-destructive px-2 py-0.5 ring-1 ring-destructive/20">
                Slettet
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
            {business?.category && <span>{business.category}</span>}
            {business?.city && <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{business.city}</span>}
            {owner?.email && <span className="inline-flex items-center gap-0.5"><Mail className="h-3 w-3" />{owner.email}</span>}
            {business?.slug && (
              <Link to={`/b/${business.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-accent hover:underline">
                <ExternalLink className="h-3 w-3" />/{business.slug}
              </Link>
            )}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Oversigt</TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
            <TabsTrigger value="users">Brugere</TabsTrigger>
            <TabsTrigger value="audit">Log</TabsTrigger>
            <TabsTrigger value="danger" className="text-destructive data-[state=active]:text-destructive">Fare</TabsTrigger>
          </TabsList>

          {/* ====== OVERSIGT ====== */}
          <TabsContent value="overview" className="space-y-3 mt-4">
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">Status</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Oprettet" value={fmtDate(business?.created_at)} />
                <Stat label="Plan-status" value={plan?.status || "—"} />
                <Stat label="Verificeret" value={business?.is_verified ? "Ja" : "Nej"} />
                <Stat label="Aktiv" value={business?.is_active ? "Ja" : "Nej"} />
                <Stat label="Prøve slutter" value={fmtDate(plan?.trial_ends_at)} />
                <Stat label="Dage tilbage" value={daysLeft !== null ? `${daysLeft}` : "—"} />
              </div>
            </Card>

            <Card className="p-4 space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Status-handlinger</h3>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline"
                  onClick={async () => {
                    const { error } = await supabase.from("businesses").update({ is_verified: !business?.is_verified }).eq("id", businessId!);
                    if (error) toast.error(error.message); else { toast.success("Opdateret"); invalidateAll(); }
                  }}>
                  {business?.is_verified ? <><XCircle className="h-3.5 w-3.5 mr-1.5" />Fjern verifikation</> : <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Verificér</>}
                </Button>
                <Button size="sm" variant="outline"
                  onClick={async () => {
                    const { error } = await supabase.from("businesses").update({ is_active: !business?.is_active }).eq("id", businessId!);
                    if (error) toast.error(error.message); else { toast.success("Opdateret"); invalidateAll(); }
                  }}>
                  {business?.is_active ? "Deaktivér" : "Aktivér"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* ====== PLAN ====== */}
          <TabsContent value="plan" className="space-y-3 mt-4">
            {/* Trial */}
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><CalendarClock className="h-4 w-4" />Prøveperiode</h3>
              <div className="text-xs text-muted-foreground">
                Slutter: <span className="font-medium text-foreground">{fmtDate(plan?.trial_ends_at)}</span>
                {daysLeft !== null && <> · {daysLeft} dage tilbage</>}
              </div>
              <div className="flex flex-wrap gap-2">
                {[7, 14, 30].map((d) => (
                  <Button key={d} size="sm" variant="outline"
                    onClick={() => rpc.mutate({ fn: "admin_extend_trial", args: { p_business_id: businessId, p_days: d }, successMsg: `Prøveperiode forlænget med ${d} dage` })}>
                    +{d} dage
                  </Button>
                ))}
                <div className="flex gap-1.5 items-center">
                  <Input className="h-9 w-20" type="number" value={extendDays} onChange={(e) => setExtendDays(e.target.value)} />
                  <Button size="sm" variant="outline"
                    onClick={() => {
                      const d = parseInt(extendDays, 10);
                      if (isNaN(d)) return toast.error("Ugyldigt tal");
                      rpc.mutate({ fn: "admin_extend_trial", args: { p_business_id: businessId, p_days: d }, successMsg: `Forlænget med ${d} dage` });
                    }}>Forlæng</Button>
                </div>
                <Button size="sm" variant="outline"
                  onClick={() => rpc.mutate({ fn: "admin_reset_trial", args: { p_business_id: businessId, p_days: 14 }, successMsg: "Prøveperiode nulstillet til 14 dage" })}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Nulstil (14d)
                </Button>
                <Button size="sm" variant="outline" className="text-amber-700 hover:text-amber-800"
                  onClick={() => {
                    if (!confirm("Afslut prøveperioden NU? Virksomheden vil straks blive bedt om at tilføje kort.")) return;
                    rpc.mutate({ fn: "admin_end_trial_now", args: { p_business_id: businessId }, successMsg: "Prøveperiode afsluttet" });
                  }}>
                  <Zap className="h-3.5 w-3.5 mr-1.5" />Afslut nu
                </Button>
              </div>
            </Card>

            {/* Betaling */}
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4" />Betaling</h3>
              <div className="text-sm">
                {hasCard ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                    <CreditCard className="h-3.5 w-3.5" />
                    {plan?.stripe_payment_method_brand || "Kort"} •••• {plan?.stripe_payment_method_last4}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Intet kort på fil</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Stat label="Månedspris" value={fmtKr(Number(plan?.monthly_price_dkk) || 0)} />
                <Stat label="Periode" value={plan?.billing_period || "—"} />
                <Stat label="Rute-planlægning" value={plan?.route_planning_enabled ? "Ja" : "Nej"} />
                <Stat label="Regnskab" value={plan?.accounting_integration_enabled ? "Ja" : "Nej"} />
                <Stat label="Ekstra logins" value={`${plan?.extra_employee_logins || 0}`} />
                <Stat label="Stripe sub" value={plan?.stripe_subscription_id ? "Aktiv" : "—"} />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Textarea
                  placeholder="Note (fx 'kulance — kunde havde tekniske problemer')"
                  className="text-xs min-h-[60px]"
                  value={forceNote}
                  onChange={(e) => setForceNote(e.target.value)}
                />
              </div>
              <Button size="sm" variant="outline" className="w-full"
                onClick={() => {
                  if (!confirm("Markér virksomheden som BETALENDE manuelt (uden Stripe-kort)?")) return;
                  rpc.mutate({ fn: "admin_force_active", args: { p_business_id: businessId, p_note: forceNote || null }, successMsg: "Virksomhed markeret som aktiv" });
                }}>
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Markér som betalende (kulance)
              </Button>
              {hasCard && (
                <Button size="sm" variant="outline" className="w-full text-amber-700"
                  onClick={async () => {
                    if (!confirm("Fjern det gemte kort fra Lovable-databasen? Stripe-abonnementet annulleres IKKE automatisk.")) return;
                    const { error } = await supabase.from("business_plans").update({
                      stripe_payment_method_last4: null,
                      stripe_payment_method_brand: null,
                      status: 'trialing',
                    }).eq("business_id", businessId!);
                    if (error) toast.error(error.message); else { toast.success("Kort fjernet"); invalidateAll(); }
                  }}>
                  Fjern gemt kort
                </Button>
              )}
            </Card>

            {/* Ejer */}
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><UserCog className="h-4 w-4" />Ejer</h3>
              <div className="text-xs text-muted-foreground">
                Nuværende: <span className="font-medium text-foreground">{owner?.email || "—"}</span>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Overdrag til (e-mail på eksisterende bruger)</Label>
                <div className="flex gap-2">
                  <Input type="email" placeholder="ny.ejer@eksempel.dk" value={transferEmail} onChange={(e) => setTransferEmail(e.target.value)} className="h-9" />
                  <Button size="sm" variant="outline"
                    disabled={!transferEmail.includes("@")}
                    onClick={() => {
                      if (!confirm(`Overdrag "${business?.name}" til ${transferEmail}?`)) return;
                      rpc.mutate({
                        fn: "admin_transfer_business_owner",
                        args: { p_business_id: businessId, p_new_owner_email: transferEmail },
                        successMsg: "Ejer opdateret",
                      });
                      setTransferEmail("");
                    }}>Overdrag</Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* ====== BRUGERE ====== */}
          <TabsContent value="users" className="space-y-3 mt-4">
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <UserCog className="h-4 w-4" /> Ejer
              </h3>
              {owner?.email ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{owner.email}</p>
                    <p className="text-xs text-muted-foreground">Virksomhedsejer</p>
                  </div>
                  <Button
                    asChild size="sm" variant="outline"
                    aria-label={`Send mail til ${owner.email}`}
                  >
                    <a href={`mailto:${owner.email}`}><Mail className="h-3.5 w-3.5 mr-1.5" />Mail</a>
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Ingen ejer fundet.</p>
              )}
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" /> Medarbejdere
                  <span className="text-xs font-normal text-muted-foreground">({employees?.length ?? 0})</span>
                </h3>
              </div>
              {!employees?.length ? (
                <p className="text-xs text-muted-foreground">Ingen medarbejdere oprettet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {employees.map((e: any) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="truncate text-sm font-medium text-foreground">{e.name || "Uden navn"}</p>
                          {!e.is_active && (
                            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">Inaktiv</span>
                          )}
                          {e.user_id && (
                            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Login</span>
                          )}
                          {e.livechat_enabled && (
                            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">Livechat</span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {[e.title, e.email, e.phone].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                      {e.email && (
                        <Button asChild size="sm" variant="ghost" className="h-9 w-9 p-0" aria-label={`Mail ${e.email}`}>
                          <a href={`mailto:${e.email}`}><Mail className="h-3.5 w-3.5" /></a>
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-muted-foreground/80">
                <KeyRound className="inline h-3 w-3 mr-1" />
                Adgangskode-reset og suspendering kommer i næste opdatering — brug indtil videre admin-impersonation.
              </p>
            </Card>
          </TabsContent>

          {/* ====== AUDIT LOG ====== */}
          <TabsContent value="audit" className="space-y-2 mt-4">
            <Card className="p-3">
              <h3 className="text-sm font-semibold mb-2">Seneste admin-handlinger</h3>
              {!auditLog?.length ? (
                <p className="text-xs text-muted-foreground">Ingen handlinger registreret endnu.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {auditLog.map((e: any) => (
                    <li key={e.id} className="py-2 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">{e.action}</p>
                          <p className="text-muted-foreground">{e.admin_email || e.admin_id}</p>
                          {e.details && Object.keys(e.details).length > 0 && (
                            <pre className="mt-1 overflow-x-auto rounded bg-secondary/40 p-1.5 text-[10px] text-muted-foreground">{JSON.stringify(e.details, null, 2)}</pre>
                          )}
                        </div>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {new Date(e.created_at).toLocaleString("da-DK", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabsContent>

          {/* ====== FARE-ZONE ====== */}
          <TabsContent value="danger" className="space-y-3 mt-4">
            <Card className="p-4 space-y-3 border-destructive/30 bg-destructive/5">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />Destruktive handlinger
              </h3>
              <p className="text-xs text-muted-foreground">
                Soft-delete arkiverer virksomheden (skjult fra alt, kan gendannes). Hard-delete fjerner permanent inkl. alle services, ordrer, kunder.
              </p>

              {!isDeleted ? (
                <Button size="sm" variant="outline" className="w-full"
                  onClick={() => {
                    if (!confirm(`Soft-delete "${business?.name}"? Kan gendannes.`)) return;
                    rpc.mutate({ fn: "admin_soft_delete_business", args: { p_business_id: businessId }, successMsg: "Virksomhed arkiveret" });
                  }}>
                  <Archive className="h-3.5 w-3.5 mr-1.5" />Soft-delete (kan fortrydes)
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="w-full"
                  onClick={() => rpc.mutate({ fn: "admin_restore_business", args: { p_business_id: businessId }, successMsg: "Virksomhed gendannet" })}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Gendan
                </Button>
              )}

              <Button size="sm" variant="destructive" className="w-full"
                onClick={() => setConfirmHardDelete(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />Hard-delete permanent
              </Button>
            </Card>
          </TabsContent>
        </Tabs>

        <AlertDialog open={confirmHardDelete} onOpenChange={setConfirmHardDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />Permanent sletning
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>Dette sletter <span className="font-semibold text-foreground">{business?.name}</span> permanent inkl. alle services, ordrer, kunder, ruter og medarbejdere. <span className="font-semibold">Kan ikke fortrydes.</span></p>
                  <p>Skriv virksomhedens fulde navn for at bekræfte:</p>
                  <Input value={hardDeleteName} onChange={(e) => setHardDeleteName(e.target.value)} placeholder={business?.name} autoFocus />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setConfirmHardDelete(false); setHardDeleteName(""); }}>Annullér</AlertDialogCancel>
              <AlertDialogAction
                disabled={hardDeleteName !== business?.name}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  try {
                    const { error } = await supabase.rpc("admin_hard_delete_business" as any, {
                      p_business_id: businessId, p_confirm_name: hardDeleteName,
                    });
                    if (error) throw error;
                    toast.success("Virksomhed slettet permanent");
                    setConfirmHardDelete(false);
                    setHardDeleteName("");
                    invalidateAll();
                    onClose();
                  } catch (e: any) {
                    toast.error(e.message || "Sletning fejlede");
                  }
                }}>
                Slet permanent
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-secondary/40 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  );
}