import { useEffect, useState } from "react";
import { Camera, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsBelowBreakpoint } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { askConfirm } from "@/components/ConfirmDialogHost";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ImageUpload from "@/components/business/ImageUpload";
import { Field, Section, SheetFooterBar, SheetHeaderBlock } from "@/components/route-planner/SheetSection";
import { useUpdateProfile } from "@/hooks/useDatabase";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  name?: string | null;
  avatarUrl?: string | null;
};

export function AccountProfileSheet({ open, onOpenChange, userId, name: initialName, avatarUrl: initialAvatar }: Props) {
  const compact = useIsBelowBreakpoint(1024);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const updateProfile = useUpdateProfile();

  useEffect(() => {
    if (!open) return;
    setName(initialName || "");
    setAvatarUrl(initialAvatar || "");
  }, [initialAvatar, initialName, open]);

  const dirty = name.trim() !== (initialName || "").trim() || avatarUrl !== (initialAvatar || "");
  const close = async () => {
    if (saving) return;
    if (!dirty || await askConfirm({ title: "Kassér ændringer?", description: "Dit navn eller profilbillede er ikke gemt.", confirmLabel: "Kassér", cancelLabel: "Bliv her" })) onOpenChange(false);
  };
  const save = async () => {
    const nextName = name.trim();
    if (nextName.length < 2) {
      toast.error("Skriv dit navn", { description: "Navnet skal være mindst 2 tegn." });
      return;
    }
    setSaving(true);
    try {
      if (!userId) throw new Error("Din profil kunne ikke findes.");
      await updateProfile.mutateAsync({ userId, display_name: nextName, avatar_url: avatarUrl || null });
      const { error } = await supabase.auth.updateUser({ data: { display_name: nextName, avatar_url: avatarUrl || null } });
      if (error) throw error;
      toast.success("Din profil er opdateret");
      onOpenChange(false);
    } catch {
      toast.error("Profilen kunne ikke gemmes", { description: "Kontrollér forbindelsen og prøv igen." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => next ? onOpenChange(true) : void close()}>
      <SheetContent side={compact ? "bottom" : "right"} className={compact ? "appointment-details-overlay planner-overlay flex max-h-[92dvh] flex-col gap-0 overflow-hidden !rounded-t-md p-0" : "appointment-details-overlay planner-overlay flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"}>
        <SheetHeader className="planner-overlay-header shrink-0 border-b border-border px-4 py-3 pr-12 text-left">
          <SheetTitle className="sr-only">Rediger profil</SheetTitle>
          <SheetDescription className="sr-only">Skift dit navn og profilbillede.</SheetDescription>
          <SheetHeaderBlock icon={<UserRound className="h-4 w-4" />} title="Rediger profil" description="Dit navn og billede bruges på din konto i virksomhedspanelet." />
        </SheetHeader>
        <div className="planner-overlay-body min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <Section icon={<Camera className="h-4 w-4" />} title="Profilbillede" tone="sky" hint="Kvadratisk billede">
            <div className="flex justify-center">
              <ImageUpload folder={`${userId || "account"}/account-profile`} currentUrl={avatarUrl || null} onUploaded={setAvatarUrl} label="" className="w-28 sm:w-32" aspectRatio="aspect-square" showHint={false} maxDimension={640} />
            </div>
          </Section>
          <Section icon={<UserRound className="h-4 w-4" />} title="Oplysninger" tone="primary">
            <Field label="Navn" required hint="Virksomhedens navn og offentlige oplysninger ændres fortsat under Indstillinger.">
              <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" className="h-11 text-base" />
            </Field>
          </Section>
        </div>
        <SheetFooterBar className="grid grid-cols-2 gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="outline" className="h-12" onClick={() => void close()} disabled={saving}>Annullér</Button>
          <Button className="h-12" onClick={() => void save()} disabled={!dirty || saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gem profil"}</Button>
        </SheetFooterBar>
      </SheetContent>
    </Sheet>
  );
}