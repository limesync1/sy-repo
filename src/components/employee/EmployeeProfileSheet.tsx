import { useEffect, useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ImageUpload from "@/components/business/ImageUpload";
import { useIsBelowBreakpoint } from "@/hooks/use-mobile";
import { toast } from "sonner";

type EmployeeProfile = { id: string; name?: string | null; avatar_url?: string | null };
type Props = { open: boolean; onOpenChange: (open: boolean) => void; employee?: EmployeeProfile | null; userId?: string };

export function EmployeeProfileSheet({ open, onOpenChange, employee, userId }: Props) {
  const compact = useIsBelowBreakpoint(1024);
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setName(employee?.name || ""); setAvatarUrl(employee?.avatar_url || ""); } }, [employee?.avatar_url, employee?.name, open]);
  const dirty = name.trim() !== (employee?.name || "") || avatarUrl !== (employee?.avatar_url || "");
  const close = () => { if (!saving && (!dirty || window.confirm("Kassér ændringerne i din profil?"))) onOpenChange(false); };
  const save = async () => {
    if (!employee?.id || !userId) return;
    const nextName = name.trim();
    if (nextName.length < 2) { toast.error("Skriv dit navn", { description: "Navnet skal være mindst 2 tegn." }); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("employees").update({ name: nextName, avatar_url: avatarUrl || null }).eq("id", employee.id).eq("user_id", userId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["my-employees", userId] });
      toast.success("Din profil er opdateret"); onOpenChange(false);
    } catch { toast.error("Profilen kunne ikke gemmes", { description: "Kontrollér forbindelsen og prøv igen.", action: { label: "Prøv igen", onClick: () => void save() } }); }
    finally { setSaving(false); }
  };
  return <Sheet open={open} onOpenChange={(next) => next ? onOpenChange(true) : close()}>
    <SheetContent side={compact ? "bottom" : "right"} className={compact ? "appointment-details-overlay planner-overlay flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-t-md p-0" : "appointment-details-overlay planner-overlay flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"}>
      <SheetHeader className="shrink-0 border-b border-border p-4 pr-12 text-left sm:p-5 sm:pr-12"><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground"><UserRound className="h-4 w-4" /></span><div className="min-w-0"><SheetTitle className="text-base">Rediger profil</SheetTitle><SheetDescription className="text-xs">Dit navn og billede vises i medarbejderpanelet.</SheetDescription></div></div></SheetHeader>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-secondary/20 p-4 sm:p-5"><div className="rounded-md border border-border bg-card p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profilbillede</p><ImageUpload folder={`${userId || "employee"}/employee-profile`} currentUrl={avatarUrl || null} onUploaded={setAvatarUrl} label="" className="mx-auto w-32" aspectRatio="aspect-square" showHint maxDimension={640} /></div><label className="block space-y-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Navn<Input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="h-11 bg-card text-base normal-case" /></label><p className="text-xs leading-relaxed text-muted-foreground">Stilling, adgang og provision ændres fortsat af virksomheden.</p></div>
      <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><Button variant="outline" className="h-11" onClick={close} disabled={saving}>Annullér</Button><Button className="h-11" onClick={() => void save()} disabled={!dirty || saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gem profil"}</Button></div>
    </SheetContent>
  </Sheet>;
}