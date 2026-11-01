import { Link } from "react-router-dom";
import { relatedContent } from "@/seo/related-content";
import { CITIES } from "@/pages/cities/cleaningCityData";

interface Props {
  /** Aktuel kategori — vi prioriterer indhold i samme kategori. */
  category?: string;
  /** Sti til den nuværende artikel/guide — udelukkes fra forslag. */
  currentPath: string;
  /** Skjul afsnittet helt hvis intet matcher (default false — viser altid op til 3+3). */
  hideIfEmpty?: boolean;
}

/**
 * Viser op til 3 relaterede prisguides + 3 blogposts i samme kategori.
 * Forbedrer intern linking (PageRank-flow), brugerens dwell time og
 * Google's evne til at gruppere indhold tematisk.
 */
const RelatedContent = ({ category, currentPath, hideIfEmpty }: Props) => {
  const { guides: relatedGuides, posts: relatedPosts } = relatedContent(category, currentPath);

  if (hideIfEmpty && relatedGuides.length === 0 && relatedPosts.length === 0) return null;

  return (
    <aside aria-labelledby="related-heading" className="not-prose my-12">
      <h2 id="related-heading" className="mb-5 text-2xl font-semibold text-foreground">
        Læs også
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {relatedGuides.map((g) => (
          <Link
            key={g.href}
            to={g.href}
            className="group flex flex-col rounded-xl border border-border bg-card p-5 transition hover:border-foreground/40 hover:shadow-sm"
          >
            <span className="mb-2 inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {g.tag}
            </span>
            <h3 className="text-base font-semibold text-foreground group-hover:underline">
              {g.title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{g.desc}</p>
          </Link>
        ))}
        {relatedPosts.map((p) => (
          <Link
            key={p.slug}
            to={`/blog/${p.slug}`}
            className="group flex flex-col rounded-xl border border-border bg-card p-5 transition hover:border-foreground/40 hover:shadow-sm"
          >
            <span className="mb-2 inline-flex w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {p.category} · {p.readingMinutes} min
            </span>
            <h3 className="text-base font-semibold text-foreground group-hover:underline">
              {p.title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
          </Link>
        ))}
      </div>
    
      {category === "Rengøring" && (
        <div className="mt-8 border-t border-border pt-8">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Find lokal hjælp i din by</h3>
          <div className="flex flex-wrap gap-2">
            {CITIES.slice(0, 8).map((city) => (
              <Link
                key={city.slug}
                to={`/rengoering/${city.slug}`}
                className="rounded-full border border-border bg-muted/30 px-3 py-1 text-sm text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
              >
                Rengøring i {city.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};

export default RelatedContent;