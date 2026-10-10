import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { askConfirm } from "@/components/ConfirmDialogHost";
import { useUpdateProfile } from "@/hooks/useDatabase";
import { ProfileEditSheetLayout } from "@/components/shared/ProfileEditSheetLayout";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  name?: string | null;
  avatarUrl?: string | null;
};

export function AccountProfileSheet({ open, onOpenChange, userId, name: initialName, avatarUrl: initialAvatar }: Props) {
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

  return <ProfileEditSheetLayout open={open} onRequestOpenChange={(next) => next ? onOpenChange(true) : void close()} description="Dit navn og billede bruges på din konto i virksomhedspanelet." fieldHint="Virksomhedens navn og offentlige oplysninger ændres fortsat under Indstillinger." uploadFolder={`${userId || "account"}/account-profile`} avatarUrl={avatarUrl} onAvatarChange={setAvatarUrl} name={name} onNameChange={setName} saving={saving} dirty={dirty} onCancel={() => void close()} onSave={() => void save()} saveContent={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gem profil"} />;
}