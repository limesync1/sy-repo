// EmployeeAvatars — kompakt stak af medarbejder-avatars med navne-boks.
// Bruges på aftalekort i RouteStopsPanel, sygemeldingskort og rute-niveau.
//
// Navne-boksen portales (via ui/hover-card) til <body>, fordi aftalekortene klipper indhold
// (overflow-hidden). Uden portal blev navnet halvt skjult ved kortets kant.

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
  /** Medarbejder der er ansvarlig (lead) — markeres i navne-boksen. */
  leadId?: string | null;
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

const TRIGGER_CLASS =
  "relative inline-flex shrink-0 cursor-default items-center justify-center rounded-full ring-2 ring-card transition-transform duration-150 hover:z-10 hover:scale-110 focus-visible:z-10 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-accent motion-reduce:transition-none";

/** Navne-boks der altid ligger oven på siden og flytter sig efter plads. */
const NameCard = ({ children, wide }: { children: React.ReactNode; wide?: boolean }) => (
    <HoverCardContent
      side="top"
      align="center"
      sideOffset={6}
      collisionPadding={8}
      className={cn("p-2", wide ? "w-44" : "w-auto max-w-[16rem]")}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </HoverCardContent>
);

const LeadTag = () => (
  <span className="mt-1 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-foreground">
    Ansvarlig
  </span>
);

export const EmployeeAvatars = ({
  employees, max = 3, size = 18, className, showEmpty, leadId,
}: Props) => {
  if (employees.length === 0) {
    if (!showEmpty) return null;
    return (
      <span className="text-[10px] text-muted-foreground italic">Ingen tildelt</span>
    );
  }
  const visible = employees.slice(0, max);
  const hidden = employees.slice(max);
  const fontSize = Math.max(8, Math.round(size * 0.42));
  // Mindre overlap end før, så man rammer den rigtige avatar.
  const overlap = Math.round(size * 0.18);

  return (
    <div
      className={cn("flex shrink-0 items-center", className)}
      role="group"
      aria-label={`Medarbejdere: ${employees.map((e) => e.name).join(", ")}`}
    >
      {visible.map((e, i) => (
        <HoverCard key={e.id} openDelay={120} closeDelay={60}>
          <HoverCardTrigger asChild>
            <span
              tabIndex={0}
              aria-label={e.id === leadId ? `${e.name} (ansvarlig)` : e.name}
              className={TRIGGER_CLASS}
              style={{
                width: size,
                height: size,
                marginLeft: i === 0 ? 0 : -overlap,
                background: e.avatar_url ? undefined : e.color || "hsl(var(--muted-foreground))",
                color: readableTokenOn(e.color),
                fontSize,
              }}
              onClick={(ev) => ev.stopPropagation()}
            >
              {e.avatar_url ? (
                <img
                  src={e.avatar_url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="font-semibold leading-none">{initials(e.name)}</span>
              )}
            </span>
          </HoverCardTrigger>
          <NameCard wide={!!e.avatar_url}>
            {e.avatar_url && (
              <img
                src={e.avatar_url}
                alt=""
                className="mb-2 aspect-square w-full rounded-lg border border-border object-cover"
              />
            )}
            <p className="break-words text-center text-sm font-semibold leading-snug text-foreground">{e.name}</p>
            {e.id === leadId && <div className="text-center"><LeadTag /></div>}
          </NameCard>
        </HoverCard>
      ))}
      {hidden.length > 0 && (
        <HoverCard openDelay={120} closeDelay={60}>
          <HoverCardTrigger asChild>
            <span
              tabIndex={0}
              aria-label={`${hidden.length} flere: ${hidden.map((e) => e.name).join(", ")}`}
              className={cn(TRIGGER_CLASS, "bg-muted font-bold text-muted-foreground")}
              style={{ height: size, minWidth: size, padding: "0 4px", marginLeft: -overlap, fontSize }}
              onClick={(ev) => ev.stopPropagation()}
            >
              +{hidden.length}
            </span>
          </HoverCardTrigger>
          <NameCard>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Også på aftalen</p>
            <ul className="space-y-0.5">
              {hidden.map((e) => (
                <li key={e.id} className="break-words text-sm font-medium text-foreground">
                  {e.name}{e.id === leadId ? " · ansvarlig" : ""}
                </li>
              ))}
            </ul>
          </NameCard>
        </HoverCard>
      )}
    </div>
  );
};
