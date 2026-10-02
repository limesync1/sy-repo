// EmployeeAvatar — én fælles avatar til medarbejdere overalt.
// Har medarbejderen et profilbillede, vises kun billedet. Ellers vises
// medarbejderens farve med deres initialer (signatur), i læsbar kontrast.
import { useState } from "react";
import { cn } from "@/lib/utils";

export type EmployeeAvatarData = {
  name?: string | null;
  color?: string | null;
  avatar_url?: string | null;
};

export const employeeInitials = (name?: string | null) =>
  (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "?";

const FALLBACK_COLOR = "hsl(var(--muted-foreground))";

/** Vælger foreground/background-token ud fra farvens lysstyrke. */
export const readableOnEmployeeColor = (color?: string | null) => {
  const hex = color?.trim().match(/^#?([0-9a-f]{6})$/i)?.[1];
  if (!hex) return "hsl(var(--background))";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.62 ? "hsl(var(--foreground))" : "hsl(var(--background))";
};

type Props = {
  employee?: EmployeeAvatarData | null;
  /** Pixel-størrelse (bredde = højde). */
  size?: number;
  className?: string;
  /** Firkantede hjørner i stedet for rund. */
  rounded?: "full" | "md";
  title?: string;
};

export const EmployeeAvatar = ({ employee, size = 28, className, rounded = "full", title }: Props) => {
  const [broken, setBroken] = useState(false);
  const name = employee?.name || "Medarbejder";
  const radius = rounded === "full" ? "rounded-full" : "rounded-md";
  if (employee?.avatar_url && !broken) {
    return (
      <img
        src={employee.avatar_url}
        alt={name}
        title={title ?? name}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
        className={cn("shrink-0 object-cover", radius, className)}
        style={{ width: size, height: size }}
      />
    );
  }
  const bg = employee?.color || FALLBACK_COLOR;
  return (
    <span
      role="img"
      aria-label={name}
      title={title ?? name}
      className={cn("inline-flex shrink-0 select-none items-center justify-center font-semibold leading-none", radius, className)}
      style={{
        width: size,
        height: size,
        background: bg,
        color: readableOnEmployeeColor(employee?.color),
        fontSize: Math.max(8, Math.round(size * (size >= 80 ? 0.36 : 0.4))),
      }}
    >
      {employeeInitials(employee?.name)}
    </span>
  );
};

export default EmployeeAvatar;
