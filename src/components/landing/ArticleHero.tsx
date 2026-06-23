import { ReactNode } from "react";
import { Link } from "react-router-dom";

export interface Crumb {
  label: string;
  to?: string;
}

interface ArticleHeroProps {
  /** Breadcrumb trail rendered at the very top of the hero. */
  breadcrumbs: Crumb[];
  /** Small uppercase label above the title (category, "Prisguide" etc.). */
  eyebrow?: string;
  /** Main page title. */
  title: ReactNode;
  /** Supporting deck below the title. */
  subtitle?: ReactNode;
}

/**
 * Shared dark page header for content pages (guides, prisguides, by-sider,
 * blog-artikler). Spejler forsidens hero visuelt — samme mørke marine canvas,
 * accent-glows og bredde (max-w-7xl) — så alle indholdssider får samme
 * premium ramme i stedet for en fladt hvidt hoved.
 */
const ArticleHero = ({ breadcrumbs, eyebrow, title, subtitle }: ArticleHeroProps) => {
  return (
    <section
      className="relative isolate overflow-hidden text-background"
      style={{ backgroundColor: "hsl(var(--hero-bg))" }}
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(90deg, hsl(var(--hero-bg)) 0%, hsl(var(--hero-bg) / 0.92) 55%, hsl(var(--hero-bg) / 0.6) 100%)",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -top-32 right-[-6%] h-[26rem] w-[26rem] rounded-full opacity-30 blur-[110px]"
          style={{ backgroundColor: "hsl(var(--hero-mid))" }}
        />
        <div
          className="absolute -bottom-28 -left-20 h-[20rem] w-[20rem] rounded-full opacity-20 blur-[100px]"
          style={{ backgroundColor: "hsl(var(--hero-cyan))" }}
        />
        <div className="absolute inset-0 bg-noise opacity-[0.05] mix-blend-overlay" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8 lg:pb-14 lg:pt-10">
        <nav
          aria-label="Brødkrummer"
          className="text-[12px] font-medium text-background/65 sm:text-[13px]"
        >
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            {breadcrumbs.map((c, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <li key={`${c.label}-${i}`} className="flex items-center gap-x-1.5">
                  {c.to && !isLast ? (
                    <Link to={c.to} className="transition hover:text-background">
                      {c.label}
                    </Link>
                  ) : (
                    <span className={isLast ? "text-background" : undefined}>{c.label}</span>
                  )}
                  {!isLast && <span aria-hidden className="text-background/35">/</span>}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="mt-5 max-w-3xl">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full border border-background/25 bg-background/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-background/85 backdrop-blur sm:text-xs">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: "hsl(var(--hero-cyan-bright))" }}
              />
              {eyebrow}
            </span>
          )}
          <h1 className="mt-3 text-[1.9rem] font-semibold leading-[1.08] tracking-[-0.025em] text-background sm:text-[2.45rem] lg:text-[2.95rem]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-background/80 sm:text-[17px] sm:leading-[1.6]">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default ArticleHero;