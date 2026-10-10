import type { ReactNode } from "react";
import { Camera, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ImageUpload from "@/components/business/ImageUpload";
import { Field, Section, SheetFooterBar, SheetHeaderBlock } from "@/components/route-planner/SheetSection";

type Props = {
  open: boolean;
  onRequestOpenChange: (open: boolean) => void;
  description: string;
  fieldHint: string;
  uploadFolder: string;
  avatarUrl: string;
  onAvatarChange: (url: string) => void;
  name: string;
  onNameChange: (name: string) => void;
  saving: boolean;
  dirty: boolean;
  onCancel: () => void;
  onSave: () => void;
  saveContent: ReactNode;
};

/**
 * Samme vindue som «Opret bestilling» og «Ny rute»: centreret dialog med
 * header-blok, sektioner på dæmpet baggrund og fast footer.
 */
export function ProfileEditSheetLayout({
  open, onRequestOpenChange, description, fieldHint, uploadFolder, avatarUrl,
  onAvatarChange, name, onNameChange, saving, dirty, onCancel, onSave, saveContent,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onRequestOpenChange}>
      <DialogContent className="appointment-details-overlay planner-overlay flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-md p-0 pb-0 sm:max-h-[92vh] sm:p-0">
        <DialogHeader className="planner-overlay-header shrink-0 space-y-0 border-b px-4 py-3 pr-12 text-left sm:px-5">
          <SheetHeaderBlock
            icon={<UserRound className="h-4 w-4" />}
            title={<DialogTitle className="text-base">Rediger profil</DialogTitle>}
            description={<DialogDescription className="text-xs leading-snug">{description}</DialogDescription>}
          >
            {dirty ? <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-foreground">Ikke gemt</span> : null}
          </SheetHeaderBlock>
        </DialogHeader>

        <div className="planner-overlay-body min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-secondary/20 px-3 py-4 sm:px-5">
          <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
            <Section icon={<Camera className="h-3.5 w-3.5" />} title="Profilbillede" tone="sky">
              <div className="flex justify-center">
                <ImageUpload folder={uploadFolder} currentUrl={avatarUrl || null} onUploaded={onAvatarChange} label="" className="w-28 sm:w-32" aspectRatio="aspect-square" showHint={false} maxDimension={640} />
              </div>
            </Section>
            <Section icon={<UserRound className="h-3.5 w-3.5" />} title="Oplysninger" tone="primary" required>
              <Field label="Navn" required hint={fieldHint}>
                <Input value={name} onChange={(event) => onNameChange(event.target.value)} maxLength={80} autoComplete="name" className="h-11 text-base" />
              </Field>
            </Section>
          </div>
        </div>

        <SheetFooterBar className="pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span className="text-[11px] text-muted-foreground">{dirty ? "Du har ændringer, der ikke er gemt" : "Ingen ændringer endnu"}</span>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 sm:flex-none" onClick={onCancel} disabled={saving}>Annullér</Button>
              <Button className="flex-1 sm:flex-none" onClick={onSave} disabled={!dirty || saving}>{saveContent}</Button>
            </div>
          </div>
        </SheetFooterBar>
      </DialogContent>
    </Dialog>
  );
}
