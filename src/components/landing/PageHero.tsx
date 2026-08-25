import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Farvetoner pr. sidetype. Heroen er stadig mørk og genkendelig, men hver
 *  hovedsektion får sin egen kulør, så man visuelt kan mærke hvor man er:
 *  Find services (cyan), Få tilbud (violet), Bliv udbyder (varm), Systemet
 *  (grøn), Kundepanel (blå). */
export type HeroTone = "ocean" | "cyan" | "violet" | "amber" | "emerald" | "azure";

const TONES: Record<HeroTone, { glowA: string; glowB: string; dot: string; edge: string }> = {
  ocean:   { glowA: "hsl(var(--hero-mid))",        glowB: "hsl(var(--hero-cyan))",   dot: "hsl(var(--hero-cyan-bright))", edge: "hsl(var(--hero-cyan) / 0.55)" },
  cyan:    { glowA: "hsl(189 100% 45%)",           glowB: "hsl(201 99% 33%)",        dot: "hsl(188 100% 55%)",            edge: "hsl(189 100% 50% / 0.6)" },
  violet:  { glowA: "hsl(268 70% 52%)",            glowB: "hsl(210 90% 45%)",        dot: "hsl(268 85% 70%)",             edge: "hsl(268 80% 62% / 0.6)" },
  amber:   { glowA: "hsl(30 95% 50%)",             glowB: "hsl(350 75% 48%)",        dot: "hsl(38 100% 62%)",             edge: "hsl(32 95% 55% / 0.6)" },
  emerald: { glowA: "hsl(160 84% 39%)",            glowB: "hsl(195 90% 40%)",        dot: "hsl(158 80% 55%)",             edge: "hsl(160 80% 45% / 0.6)" },
  azure:   { glowA: "hsl(217 91% 55%)",            glowB: "hsl(190 90% 45%)",        dot: "hsl(210 100% 70%)",            edge: "hsl(217 91% 60% / 0.6)" },
};

interface PageHeroProps {
  /** Small uppercase eyebrow label rendered with an accent dot. */
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
}

/**
 * Shared dark hero used across the marketing surface (landing, search,
 * request-quote, business pages). Mirrors the visual language of the home
 * page hero: dark canvas, accent eyebrow, left-aligned headline, supporting
 * text, then optional search/CTAs. Keeps the marketing pages cohesive.
 */
const PageHero = ({
  eyebrow,
  title,
  subtitle,
  children,
  actions,
  backgroundImage,
  size = "default",
  tone = "ocean",
}: PageHeroProps) => {
  const t = TONES[tone];
  const padding =
    size === "compact"
      ? "pb-6 pt-6 sm:pb-8 sm:pt-8 lg:pb-10 lg:pt-10"
      : "pb-9 pt-8 sm:pb-12 sm:pt-10 lg:pb-24 lg:pt-20";



  return (
    <section
      className="relative isolate overflow-hidden text-background"
      style={{ backgroundColor: "hsl(var(--hero-bg))" }}
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
      {/* Ambient glows i sidens egen farvetone. Dæmpet på mobil, hvor de
          ellers fylder hele skærmen og gør farverne skrigende. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -top-32 right-[-8%] h-[20rem] w-[20rem] rounded-full opacity-[0.14] blur-[90px] sm:h-[28rem] sm:w-[28rem] sm:opacity-30 sm:blur-[110px]"
          style={{ backgroundColor: t.glowA }}
        />
        <div
          className="absolute -bottom-32 -left-24 h-[16rem] w-[16rem] rounded-full opacity-[0.12] blur-[80px] sm:h-[22rem] sm:w-[22rem] sm:opacity-25 sm:blur-[100px]"
          style={{ backgroundColor: t.glowB }}
        />
        <div className="absolute inset-0 bg-noise opacity-[0.04] mix-blend-overlay sm:opacity-[0.05]" />
      </div>
      {/* Farvet bundkant — binder heroen sammen med sidens farvetone. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px sm:h-1"
        style={{ backgroundImage: `linear-gradient(90deg, ${t.edge}, transparent 85%)` }}
      />


      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${padding}`}>
        <div className="max-w-3xl">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full border border-background/15 bg-background/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-background/75 sm:text-[11px] sm:tracking-[0.22em]">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: t.dot }}
              />

              {eyebrow}
            </span>
          )}
          <h1 className="mt-3 text-[1.75rem] font-semibold leading-[1.1] tracking-[-0.03em] text-background sm:mt-5 sm:text-[2.5rem] sm:leading-[1.08] lg:text-[3.5rem]">
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

        {/* Diskret indikator: viser at der er mere indhold under heroen på mobil. */}
        <div aria-hidden className="pointer-events-none mt-6 flex justify-center sm:hidden">
          <ChevronDown className="h-5 w-5 animate-bounce text-background/45" />
        </div>
      </div>
    </section>

  );
};

export default PageHero;