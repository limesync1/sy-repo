// EmployeeAvatars — kompakt stak af medarbejder-avatars med tooltips.
// Bruges på opgavekort i RouteStopsPanel og samlet på rute-niveau i kalenderen.

import { cn } from "@/lib/utils";

export type EmpAvatar = {
  id: string;
  name: string;
  avatar_url?: string | null;
  color?: string | null;
};

type Props = {
  employees: EmpAvatar[];
  /** Maks antal avatars vist før "+N" pille. */
  max?: number;
  /** Pixel-størrelse. */
  size?: number;
  className?: string;
  /** Vis fallback "Ingen tildelt" når listen er tom. */
  showEmpty?: boolean;
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

export const EmployeeAvatars = ({
  employees, max = 3, size = 18, className, showEmpty,
}: Props) => {
  if (employees.length === 0) {
    if (!showEmpty) return null;
    return (
      <span className="text-[10px] text-muted-foreground italic">Ingen tildelt</span>
    );
  }
  const visible = employees.slice(0, max);
  const extra = employees.length - visible.length;
  const tooltip = employees.map((e) => e.name).join(", ");
  const fontSize = Math.max(8, Math.round(size * 0.42));

  return (
    <div className={cn("flex -space-x-1.5 shrink-0", className)} title={tooltip}>
      {visible.map((e) =>
        e.avatar_url ? (
          <img
            key={e.id}
            src={e.avatar_url}
            alt={e.name}
            title={e.name}
            loading="lazy"
            className="rounded-full object-cover ring-2 ring-background"
            style={{ width: size, height: size }}
          />
        ) : (
          <span
            key={e.id}
            className="inline-flex items-center justify-center rounded-full ring-2 ring-background text-white font-semibold leading-none"
            style={{
              width: size,
              height: size,
              background: e.color || "hsl(220 13% 46%)",
              fontSize,
            }}
            title={e.name}
            aria-label={e.name}
          >
            {initials(e.name)}
          </span>
        ),
      )}
      {extra > 0 && (
        <span
          className="inline-flex items-center justify-center rounded-full ring-2 ring-background bg-muted text-muted-foreground font-bold"
          style={{ height: size, minWidth: size, padding: "0 4px", fontSize }}
          title={tooltip}
        >
          +{extra}
        </span>
      )}
    </div>
  );
};