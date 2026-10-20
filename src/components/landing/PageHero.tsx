import { ReactNode } from "react";
import BlueFlowBackground from "./BlueFlowBackground";

/** Beholdes i komponentens API, så eksisterende sider ikke skal ændres.
 *  Det visuelle udtryk er bevidst samlet i én rolig brandtone. */
export type HeroTone = "ocean" | "cyan" | "violet" | "amber" | "emerald" | "azure";

const HERO_ACCENT = {
  glowA: "hsl(var(--hero-mid))",
  glowB: "hsl(var(--hero-cyan))",
  edge: "hsl(var(--hero-cyan) / 0.32)",
};

interface PageHeroProps {
  /** Legacy label kept in the API; decorative hero labels are intentionally omitted. */
  eyebrow?: string;
  /** Main headline. Supports rich content (e.g. <span> for accent words). */
  title: ReactNode;
  /** Short supporting description below the title. */
  subtitle?: ReactNode;
  /** Optional content rendered below the subtitle (search field, location, etc.). */
  children?: ReactNode;
  /** Primary + secondary CTA row (rendered below children). */
  actions?: ReactNode;
  /** Optional background image URL — when omitted, a subtle gradient is used. */
  backgroundImage?: string;
  /** Compact vertical padding for inner pages. */
  size?: "default" | "compact";
  /** Farvetone for glows, eyebrow-prik og bundkant. */
  tone?: HeroTone;
  /**
   * Lad children (fx en søge-dropdown) rage ud over heroens bundkant uden at
   * blive klippet. Baggrundslagene klippes stadig i en egen wrapper (samme
   * trick som landing-heroens), mens sektionen selv mister overflow-hidden
   * og isolate — ellers kan dropdownen hverken ses over kanten eller lægge
   * sig over efterfølgende sticky-bars.
   */
  allowOverflow?: boolean;
}

/**
 * Shared dark hero used across the marketing surface (landing, search,
 * request-quote, business pages). Mirrors the visual language of the home
 * page hero: dark canvas, accent eyebrow, left-aligned headline, supporting
 * text, then optional search/CTAs. Keeps the marketing pages cohesive.
 */
const PageHero = ({
  eyebrow: _eyebrow,
  title,
  subtitle,
  children,
  actions,
  backgroundImage,
  size = "default",
  tone: _tone = "ocean",
  allowOverflow = false,
}: PageHeroProps) => {
  const padding =
    size === "compact"
      ? "py-7 sm:py-9 lg:py-11"
      : "py-8 sm:py-11 lg:py-14";



  return (
    <section
      className={`public-blue-surface relative text-ocean-foreground ${allowOverflow ? "" : "isolate overflow-hidden"}`}
    >
      {/* Baggrundslagene samles i en overflow-hidden wrapper, så glows og
          gradients stadig klippes ved heroens kanter — også når sektionen
          selv tillader overflow for dropdowns (allowOverflow). */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 overflow-hidden ${allowOverflow ? "z-0" : "-z-10"}`}
      >
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover opacity-20 sm:opacity-30"
          loading="eager"
        />
      )}
      <BlueFlowBackground variant="hero" />
      </div>
      {/* Diskret brandkant mellem topområdet og sidens indhold. */}
      <div
        aria-hidden
        className={`absolute inset-x-0 bottom-0 h-px sm:h-1 ${allowOverflow ? "" : "z-10"}`}
        style={{ backgroundImage: `linear-gradient(90deg, ${HERO_ACCENT.edge}, transparent 85%)` }}
      />


      <div className={`public-content-enter relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${padding} ${allowOverflow ? "" : "z-10"}`}>
        <div className="max-w-3xl">
          <h1 className="text-balance text-[1.75rem] font-semibold leading-[1.12] tracking-tight text-ocean-foreground sm:text-[2.25rem] lg:text-[2.75rem]">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-3 max-w-xl text-[15px] leading-6 text-ocean-foreground/90 sm:mt-4 sm:text-base sm:leading-7">
              {subtitle}
            </p>
          )}
          {children && <div className="mt-5 w-full max-w-2xl sm:mt-6">{children}</div>}
          {actions && (
            <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:flex-wrap">
              {actions}
            </div>
          )}

        </div>

      </div>
    </section>

  );
};

export default PageHero;