import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";


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
}: PageHeroProps) => {
  const padding =
    size === "compact"
      ? "pb-5 pt-5 sm:pb-8 sm:pt-8 lg:pb-10 lg:pt-10"
      : "pb-7 pt-6 sm:pb-12 sm:pt-10 lg:pb-24 lg:pt-20";


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
          className="absolute inset-0 -z-20 h-full w-full object-cover opacity-30"
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
      {/* Ambient cyan/mid-blue glows — samme sprog som forsidens hero. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -top-32 right-[-8%] h-[28rem] w-[28rem] rounded-full blur-[110px] opacity-30"
          style={{ backgroundColor: "hsl(var(--hero-mid))" }}
        />
        <div
          className="absolute -bottom-32 -left-24 h-[22rem] w-[22rem] rounded-full blur-[100px] opacity-20"
          style={{ backgroundColor: "hsl(var(--hero-cyan))" }}
        />
        <div className="absolute inset-0 bg-noise opacity-[0.05] mix-blend-overlay" />
      </div>

      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${padding}`}>
        <div className="max-w-3xl">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-background/70">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: "hsl(var(--hero-cyan-bright))" }}
              />
              {eyebrow}
            </span>
          )}
          <h1 className="mt-4 text-[1.75rem] font-semibold leading-[1.08] tracking-[-0.03em] text-background sm:mt-5 sm:text-[2.5rem] lg:text-[3.5rem]">
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