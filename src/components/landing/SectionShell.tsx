import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * SectionShell — den fælles ramme om alle sektioner på de offentlige sider.
 *
 * Formålet er rytme: alle sektioner har samme lodrette luft, samme
 * overskrifts-hierarki og samme maks-bredde, mens `tone` skifter mellem lys
 * og dæmpet baggrund, så en lang side ikke bliver én hvid flade.
 *
 * Alle farver kommer fra design-tokens (surface / sand / ocean) — aldrig
 * hardcodede utility-farver, så mørk tilstand følger med af sig selv.
 */
export type SectionTone = "default" | "muted" | "sand" | "dark";

const TONE: Record<SectionTone, string> = {
  default: "bg-background text-foreground",
  muted: "bg-surface text-foreground",
  sand: "bg-sand text-foreground",
  dark: "bg-ocean text-ocean-foreground",
};

type Props = {
  /** Lille versal-label over overskriften. */
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  /** Indhold til højre for overskriften (fx en "se alle"-knap). */
  aside?: ReactNode;
  children: ReactNode;
  tone?: SectionTone;
  /** Centreret overskrift i stedet for venstrestillet. */
  align?: "left" | "center";
  className?: string;
  id?: string;
  /** Mindre lodret luft — til korte mellemsektioner. */
  compact?: boolean;
};

const SectionShell = ({
  eyebrow, title, description, aside, children,
  tone = "default", align = "left", className, id, compact,
}: Props) => {
  const dark = tone === "dark";
  return (
    <section
      id={id}
      className={cn(
        "w-full",
        TONE[tone],
        compact ? "py-10 sm:py-12" : "py-14 sm:py-20 lg:py-24",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {(eyebrow || title || description) && (
          <div
            className={cn(
              "mb-8 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between",
              align === "center" && "sm:flex-col sm:items-center",
            )}
          >
            <div className={cn("max-w-2xl", align === "center" && "text-center")}>
              {eyebrow && (
                <span
                  className={cn(
                    "inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]",
                    dark ? "text-ocean-foreground/70" : "text-muted-foreground",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn("h-1.5 w-1.5 rounded-full", dark ? "bg-accent" : "bg-accent")}
                  />
                  {eyebrow}
                </span>
              )}
              {title && (
                <h2
                  className={cn(
                    "mt-3 text-[1.6rem] font-semibold leading-[1.12] tracking-[-0.025em] sm:text-[2.1rem] lg:text-[2.4rem]",
                    dark ? "text-ocean-foreground" : "text-foreground",
                  )}
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  className={cn(
                    "mt-3 text-[15px] leading-7",
                    dark ? "text-ocean-foreground/75" : "text-muted-foreground",
                  )}
                >
                  {description}
                </p>
              )}
            </div>
            {aside && <div className="shrink-0">{aside}</div>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
};

export default SectionShell;
