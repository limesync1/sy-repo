import type { ReactNode } from "react";
import { UiArtwork } from "@/components/shared/UiArtwork";

type Props = {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
};

/** One header for appointment details, regardless of the panel opening it. */
export function AppointmentDetailsHeader({ title, description, children }: Props) {
  return (
    <div className="flex items-start gap-3 text-left">
      <UiArtwork name="appointmentInfo" className="h-12 w-12" />
      <div className="min-w-0 flex-1">
        <div className="text-base font-semibold leading-tight text-foreground">{title}</div>
        {description && <div className="mt-1 text-xs leading-snug text-muted-foreground">{description}</div>}
        {children && <div className="mt-2 flex flex-wrap items-center gap-1.5">{children}</div>}
      </div>
    </div>
  );
}
