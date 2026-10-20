import { ReactNode } from "react";
import BlueFlowBackground from "./BlueFlowBackground";
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
      className="public-blue-surface relative isolate overflow-hidden text-ocean-foreground"
    >
      <BlueFlowBackground variant="process" />
      <div className="public-content-enter relative mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8 lg:pb-14 lg:pt-10">
        <nav
          aria-label="Brødkrummer"
          className="text-[12px] font-medium text-ocean-foreground/85 sm:text-[13px]"
        >
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            {breadcrumbs.map((c, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <li key={`${c.label}-${i}`} className="flex items-center gap-x-1.5">
                  {c.to && !isLast ? (
                    <Link to={c.to} className="transition hover:text-ocean-foreground">
                      {c.label}
                    </Link>
                  ) : (
                    <span className={isLast ? "text-ocean-foreground" : undefined}>{c.label}</span>
                  )}
                  {!isLast && <span aria-hidden className="text-ocean-foreground/60">/</span>}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="mt-5 max-w-3xl">
          {eyebrow ? <span className="sr-only">{eyebrow}</span> : null}
          <h1 className="text-[1.9rem] font-semibold leading-[1.08] text-ocean-foreground sm:text-[2.45rem] lg:text-[2.95rem]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-ocean-foreground/90 sm:text-[17px] sm:leading-[1.6]">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default ArticleHero;