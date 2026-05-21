// DangerZone — soft/hard-delete-handlinger for en virksomhed.
// Udskilt fra BusinessDetailSheet i Trin 26 så filer holder under ~400 linjer.
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { AlertTriangle, Archive, RefreshCw, Trash2 } from "lucide-react";
import { useAdminMutation } from "../lib/useAdminMutation";

interface Props {
  businessId: string;
  businessName: string;
  isDeleted: boolean;
  onInvalidate: () => void;
  onAfterHardDelete: () => void;
}

export default function DangerZone({ businessId, businessName, isDeleted, onInvalidate, onAfterHardDelete }: Props) {
  const [confirmHardDelete, setConfirmHardDelete] = useState(false);
  const [hardDeleteName, setHardDeleteName] = useState("");

  const softDelete = useAdminMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_soft_delete_business" as any, { p_business_id: businessId });
      if (error) throw new Error(error.message);
    },
    successMessage: "Virksomhed arkiveret",
    onDone: onInvalidate,
  });

  const restore = useAdminMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_restore_business" as any, { p_business_id: businessId });
      if (error) throw new Error(error.message);
    },
    successMessage: "Virksomhed gendannet",
    onDone: onInvalidate,
  });

  return (
    <>
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
              if (!confirm(`Soft-delete "${businessName}"? Kan gendannes.`)) return;
              softDelete.mutate();
            }}>
            <Archive className="h-3.5 w-3.5 mr-1.5" />Soft-delete (kan fortrydes)
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="w-full" onClick={() => restore.mutate()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Gendan
          </Button>
        )}

        <Button size="sm" variant="destructive" className="w-full" onClick={() => setConfirmHardDelete(true)}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />Hard-delete permanent
        </Button>
      </Card>

      <AlertDialog open={confirmHardDelete} onOpenChange={setConfirmHardDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />Permanent sletning
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>Dette sletter <span className="font-semibold text-foreground">{businessName}</span> permanent inkl. alle services, ordrer, kunder, ruter og medarbejdere. <span className="font-semibold">Kan ikke fortrydes.</span></p>
                <p>Skriv virksomhedens fulde navn for at bekræfte:</p>
                <Input value={hardDeleteName} onChange={(e) => setHardDeleteName(e.target.value)} placeholder={businessName} autoFocus />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setConfirmHardDelete(false); setHardDeleteName(""); }}>Annullér</AlertDialogCancel>
            <AlertDialogAction
              disabled={hardDeleteName !== businessName}
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
                  onInvalidate();
                  onAfterHardDelete();
                } catch (e: any) {
                  toast.error(e.message || "Sletning fejlede");
                }
              }}>
              Slet permanent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
