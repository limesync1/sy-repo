import { ReactNode } from "react";
import { Link } from "react-router-dom";
import PageHero from "./PageHero";

export interface Crumb {
  label: string;
  to?: string;
}

interface ArticleHeroProps {
  /** Breadcrumb trail rendered inside the hero, above the eyebrow. */
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
 * blog-artikler). Wraps <PageHero> with brødkrummer ovenover, så alle
 * indholdssider får samme premium hero som forsiden i stedet for et fladt
 * lyst hoved.
 */
const ArticleHero = ({ breadcrumbs, eyebrow, title, subtitle }: ArticleHeroProps) => {
  return (
    <PageHero
      size="compact"
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
    >
      <nav
        aria-label="Brødkrummer"
        className="-mt-2 text-xs font-medium text-background/70 sm:text-sm"
      >
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          {breadcrumbs.map((c, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <li key={`${c.label}-${i}`} className="flex items-center gap-x-1.5">
                {c.to && !isLast ? (
                  <Link
                    to={c.to}
                    className="transition hover:text-background"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-background" : undefined}>{c.label}</span>
                )}
                {!isLast && <span aria-hidden className="text-background/40">/</span>}
              </li>
            );
          })}
        </ol>
      </nav>
    </PageHero>
  );
};

export default ArticleHero;