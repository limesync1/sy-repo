// Delte hjælpere og små byggeklodser til "Meld medarbejder syg"-flowet.
import { EmployeeAvatars } from "@/components/route-planner/EmployeeAvatars";
import { cn } from "@/lib/utils";
import type { SickLeaveAction } from "@/hooks/route-planner/useSickLeave";

export type Emp = {
  id: string;
  name: string;
  is_active?: boolean;
  max_stops_per_day?: number | null;
  avatar_url?: string | null;
  color?: string | null;
};

export const localDate = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localDate(d);
};

export const prettyDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

export const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("da-DK", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

export const daysBetween = (a: string, b: string) =>
  Math.max(
    1,
    Math.round(
      (new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000,
    ) + 1,
  );

export const ACTION_LABEL: Record<SickLeaveAction, string> = {
  replace: "Erstat med kollega",
  spread: "Fordel på holdet",
  unassign: "Frigiv aftalerne",
  move_date: "Flyt ruten til anden dato",
};

export const ACTION_HINT: Record<SickLeaveAction, string> = {
  replace: "Én kollega overtager alle aftaler på ruten",
  spread: "Aftalerne deles mellem de øvrige på holdet",
  unassign: "Aftalerne bliver liggende uden tildelt medarbejder",
  move_date: "Hele ruten rykkes til en dag hvor holdet er tilbage",
};

/** Avatar + navn — bruges i vælgere og lister. */
export const EmpLine = ({
  emp,
  trailing,
  size = 24,
  className,
}: {
  emp?: Emp;
  trailing?: React.ReactNode;
  size?: number;
  className?: string;
}) => (
  <span className={cn("flex items-center gap-2 min-w-0", className)}>
    <EmployeeAvatars
      employees={
        emp ? [{ id: emp.id, name: emp.name, avatar_url: emp.avatar_url, color: emp.color }] : []
      }
      size={size}
      max={1}
    />
    <span className="truncate font-medium">{emp?.name || "Medarbejder"}</span>
    {trailing}
  </span>
);

/** Nummereret trin-overskrift inde i en sektion. */
export const StepHeading = ({
  step: _step,
  title,
  description,
}: {
  step: number;
  title: string;
  description?: string;
}) => (
  <div className="min-w-0 border-b pb-3">
    <h3 className="text-sm font-semibold leading-tight">{title}</h3>
    {description && <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">{description}</p>}
  </div>
);
