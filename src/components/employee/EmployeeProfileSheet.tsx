import { useEffect, useState } from "react";
import { Camera, Loader2, UserRound } from "lucide-react";
import { Field, Section, SheetFooterBar, SheetHeaderBlock } from "@/components/route-planner/SheetSection";
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
    <SheetContent side={compact ? "bottom" : "right"} className={compact ? "appointment-details-overlay planner-overlay flex max-h-[92dvh] flex-col gap-0 overflow-hidden !rounded-t-md p-0" : "appointment-details-overlay planner-overlay flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"}>
      <SheetHeader className="planner-overlay-header shrink-0 border-b border-border px-4 py-3 pr-12 text-left">
        <SheetTitle className="sr-only">Rediger profil</SheetTitle>
        <SheetDescription className="sr-only">Skift dit navn og profilbillede.</SheetDescription>
        <SheetHeaderBlock icon={<UserRound className="h-4 w-4" />} title="Rediger profil" description="Dit navn og billede vises for dine kolleger og kunder." />
      </SheetHeader>
      <div className="planner-overlay-body min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
        <Section icon={<Camera className="h-3.5 w-3.5" />} title="Profilbillede" tone="sky" hint="Kvadratisk billede, gerne af dit ansigt.">
          <div className="flex justify-center">
            <ImageUpload folder={`${userId || "employee"}/employee-profile`} currentUrl={avatarUrl || null} onUploaded={setAvatarUrl} label="" className="w-28 sm:w-32" aspectRatio="aspect-square" showHint={false} maxDimension={640} />
          </div>
        </Section>
        <Section icon={<UserRound className="h-3.5 w-3.5" />} title="Oplysninger" tone="primary">
          <Field label="Navn" required hint="Stilling, adgang og provision ændres af virksomheden.">
            <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" className="h-10 text-base" />
          </Field>
        </Section>
      </div>
      <SheetFooterBar className="grid grid-cols-2 gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button variant="outline" className="h-12" onClick={close} disabled={saving}>Annullér</Button>
        <Button className="h-12" onClick={() => void save()} disabled={!dirty || saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gem profil"}</Button>
      </SheetFooterBar>
    </SheetContent>
  </Sheet>;
}
