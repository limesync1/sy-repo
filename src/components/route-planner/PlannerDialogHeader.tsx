import type { ReactNode } from "react";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PanelIcon, type PanelIconName } from "@/components/shared/PanelIcon";
import { SheetHeaderBlock } from "./SheetSection";

export default function PlannerDialogHeader({ icon, artwork, title, description, children }: {
  icon?: PanelIconName;
  artwork?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <DialogHeader className="planner-overlay-header shrink-0 space-y-0 border-b px-4 py-3 pr-14 text-left sm:px-5 sm:pr-16">
      <SheetHeaderBlock
        icon={artwork ?? (icon ? <PanelIcon name={icon} className="h-14 w-14" /> : undefined)}
        iconClassName="h-14 w-14 rounded-none !bg-transparent ring-0"
        title={<DialogTitle className="text-base leading-snug">{title}</DialogTitle>}
        description={description ? <DialogDescription className="text-xs leading-snug">{description}</DialogDescription> : undefined}
      />
      {children}
    </DialogHeader>
  );
}