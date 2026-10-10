import type { ReactNode } from "react";
import { Camera, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ImageUpload from "@/components/business/ImageUpload";
import { Field, Section, SheetFooterBar, SheetHeaderBlock } from "@/components/route-planner/SheetSection";
import { useIsBelowBreakpoint } from "@/hooks/use-mobile";

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

export function ProfileEditSheetLayout({
  open, onRequestOpenChange, description, fieldHint, uploadFolder, avatarUrl,
  onAvatarChange, name, onNameChange, saving, dirty, onCancel, onSave, saveContent,
}: Props) {
  const compact = useIsBelowBreakpoint(1024);
  return (
    <Sheet open={open} onOpenChange={onRequestOpenChange}>
      <SheetContent side={compact ? "bottom" : "right"} className={compact ? "appointment-details-overlay planner-overlay flex max-h-[92dvh] flex-col gap-0 overflow-hidden !rounded-t-md p-0" : "appointment-details-overlay planner-overlay flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"}>
        <SheetHeader className="planner-overlay-header relative shrink-0 space-y-0 border-b border-border bg-card px-4 py-3 pr-14 text-left sm:px-5 sm:py-4">
          <SheetTitle className="sr-only">Rediger profil</SheetTitle>
          <SheetDescription className="sr-only">Skift dit navn og profilbillede.</SheetDescription>
          <SheetHeaderBlock icon={<UserRound className="h-4 w-4" />} title="Rediger profil" description={description}>
            {dirty ? <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning-foreground dark:text-warning">Ikke gemt</span> : null}
          </SheetHeaderBlock>
        </SheetHeader>
        <div className="planner-overlay-body min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-secondary/20 p-4 sm:p-5">
          <Section icon={<Camera className="h-3.5 w-3.5" />} title="Profilbillede" tone="sky" hint="Kvadratisk billede">
            <div className="flex justify-center">
              <ImageUpload folder={uploadFolder} currentUrl={avatarUrl || null} onUploaded={onAvatarChange} label="" className="w-28 sm:w-32" aspectRatio="aspect-square" showHint={false} maxDimension={640} />
            </div>
          </Section>
          <Section icon={<UserRound className="h-3.5 w-3.5" />} title="Oplysninger" tone="primary">
            <Field label="Navn" required hint={fieldHint}>
              <Input value={name} onChange={(event) => onNameChange(event.target.value)} maxLength={80} autoComplete="name" className="h-11 text-base" />
            </Field>
          </Section>
        </div>
        <SheetFooterBar className="grid grid-cols-2 gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="outline" className="h-12" onClick={onCancel} disabled={saving}>Annullér</Button>
          <Button className="h-12" onClick={onSave} disabled={!dirty || saving}>{saveContent}</Button>
        </SheetFooterBar>
      </SheetContent>
    </Sheet>
  );
}