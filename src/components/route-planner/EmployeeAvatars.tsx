// EmployeeAvatars — kompakt stak af medarbejder-avatars med tooltips.
// Bruges på aftalekort i RouteStopsPanel og samlet på rute-niveau i kalenderen.

import { cn } from "@/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

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

const readableTokenOn = (color?: string | null) => {
  const hex = color?.trim().match(/^#?([0-9a-f]{6})$/i)?.[1];
  if (!hex) return "hsl(var(--background))";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.62 ? "hsl(var(--foreground))" : "hsl(var(--background))";
};

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
          // Stort billede ved hover/fokus, så man kan verificere at det er den
          // rigtige medarbejder uden at forlade planlægningen.
          <HoverCard key={e.id} openDelay={150} closeDelay={80}>
            <HoverCardTrigger asChild>
              <img
                src={e.avatar_url}
                alt={e.name}
                title={e.name}
                loading="lazy"
                tabIndex={0}
                className="rounded-full object-cover ring-2 ring-background focus:outline-none focus-visible:ring-foreground/40"
                style={{ width: size, height: size }}
              />
            </HoverCardTrigger>
            <HoverCardContent side="top" align="center" className="w-48 p-2">
              <img
                src={e.avatar_url}
                alt={e.name}
                className="aspect-square w-full rounded-xl border border-border object-cover"
              />
              <p className="mt-2 truncate text-center text-xs font-semibold text-foreground">{e.name}</p>
            </HoverCardContent>
          </HoverCard>
        ) : (
          <span
            key={e.id}
            className="inline-flex items-center justify-center rounded-full ring-2 ring-background font-semibold leading-none"
            style={{
              width: size,
              height: size,
              background: e.color || "hsl(220 13% 46%)",
              color: readableTokenOn(e.color),
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