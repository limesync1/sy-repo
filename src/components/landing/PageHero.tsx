import { ReactNode } from "react";

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
      ? "pb-6 pt-6 sm:pb-8 sm:pt-8 lg:pb-10 lg:pt-10"
      : "pb-10 pt-8 sm:pb-12 sm:pt-10 lg:pb-16 lg:pt-12";

  return (
    <section className="relative isolate overflow-hidden bg-foreground text-background">
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60"
          loading="eager"
        />
      )}
      {/* Layered overlays — match the home hero treatment so text always reads. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />
      {/* Subtle accent glow in the corner for depth. */}
      <div className="absolute -right-32 top-0 -z-10 h-[420px] w-[420px] rounded-full bg-accent/15 blur-3xl" />

      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${padding}`}>
        <div className="max-w-2xl">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full border border-background/25 bg-background/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-background/85 backdrop-blur sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {eyebrow}
            </span>
          )}
          <h1 className="mt-3 text-[1.85rem] font-semibold leading-[1.1] text-background sm:text-[2.4rem] lg:text-[2.85rem]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 max-w-xl text-sm leading-6 text-background/85 sm:text-[15px]">
              {subtitle}
            </p>
          )}
          {children && <div className="mt-5 w-full max-w-2xl">{children}</div>}
          {actions && (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {actions}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PageHero;