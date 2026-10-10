import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { askConfirm } from "@/components/ConfirmDialogHost";
import { ProfileEditSheetLayout } from "@/components/shared/ProfileEditSheetLayout";

type EmployeeProfile = { id: string; name?: string | null; avatar_url?: string | null };
type Props = { open: boolean; onOpenChange: (open: boolean) => void; employee?: EmployeeProfile | null; userId?: string };

export function EmployeeProfileSheet({ open, onOpenChange, employee, userId }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setName(employee?.name || ""); setAvatarUrl(employee?.avatar_url || ""); } }, [employee?.avatar_url, employee?.name, open]);
  const dirty = name.trim() !== (employee?.name || "") || avatarUrl !== (employee?.avatar_url || "");
  const close = async () => {
    if (saving) return;
    if (dirty && !(await askConfirm({ title: "Kassér ændringer?", description: "Dit navn eller profilbillede er ikke gemt.", confirmLabel: "Kassér", cancelLabel: "Bliv her" }))) return;
    onOpenChange(false);
  };
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
  return <ProfileEditSheetLayout open={open} onRequestOpenChange={(next) => next ? onOpenChange(true) : void close()} description="Dit navn og billede vises for dine kolleger og kunder." fieldHint="Stilling, adgang og provision ændres af virksomheden." uploadFolder={`${userId || "employee"}/employee-profile`} avatarUrl={avatarUrl} onAvatarChange={setAvatarUrl} name={name} onNameChange={setName} saving={saving} dirty={dirty} onCancel={() => void close()} onSave={() => void save()} saveContent={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gem profil"} />;
}
