import { ReactNode } from "react";

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
      ? "pb-6 pt-6 sm:pb-8 sm:pt-8 lg:pb-10 lg:pt-10"
      : "pb-9 pt-8 sm:pb-12 sm:pt-10 lg:pb-24 lg:pt-20";



  return (
    <section
      className={`relative text-background ${allowOverflow ? "" : "isolate overflow-hidden"}`}
      style={{ backgroundColor: "hsl(var(--hero-bg))" }}
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
      {/* Marine gradient — sikrer kontrast og premium farveindtryk. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(90deg, hsl(var(--hero-bg)) 0%, hsl(var(--hero-bg) / 0.9) 50%, hsl(var(--hero-bg) / 0.55) 100%)",
        }}
      />
      {/* Diskret brandglød, ens på alle undersider. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -top-32 right-[-8%] h-[20rem] w-[20rem] rounded-full opacity-[0.1] blur-[100px] sm:h-[28rem] sm:w-[28rem] sm:opacity-[0.16] sm:blur-[120px]"
          style={{ backgroundColor: HERO_ACCENT.glowA }}
        />
        <div
          className="absolute -bottom-32 -left-24 h-[16rem] w-[16rem] rounded-full opacity-[0.07] blur-[90px] sm:h-[22rem] sm:w-[22rem] sm:opacity-[0.12] sm:blur-[110px]"
          style={{ backgroundColor: HERO_ACCENT.glowB }}
        />
        <div className="absolute inset-0 bg-noise opacity-[0.04] mix-blend-overlay sm:opacity-[0.05]" />
      </div>
      </div>
      {/* Diskret brandkant mellem topområdet og sidens indhold. */}
      <div
        aria-hidden
        className={`absolute inset-x-0 bottom-0 h-px sm:h-1 ${allowOverflow ? "" : "z-10"}`}
        style={{ backgroundImage: `linear-gradient(90deg, ${HERO_ACCENT.edge}, transparent 85%)` }}
      />


      <div className={`relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${padding} ${allowOverflow ? "" : "z-10"}`}>
        <div className="max-w-3xl">
          <h1 className="text-[1.75rem] font-semibold leading-[1.1] tracking-[-0.03em] text-background sm:text-[2.5rem] sm:leading-[1.08] lg:text-[3.5rem]">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-3 max-w-xl text-[14.5px] leading-6 text-background/80 sm:mt-5 sm:text-[17px] sm:leading-[1.6]">
              {subtitle}
            </p>
          )}
          {children && <div className="mt-5 w-full max-w-2xl sm:mt-7">{children}</div>}
          {actions && (
            <div className="mt-5 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:flex-wrap">
              {actions}
            </div>
          )}

        </div>

      </div>
    </section>

  );
};

export default PageHero;