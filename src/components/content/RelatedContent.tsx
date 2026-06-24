import { Link } from "react-router-dom";
import { BLOG_POSTS } from "@/pages/blog/blogPosts";
import { GUIDES } from "@/pages/guides/guidesRegistry";

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
  // Tving altid den matchende hub-side ind som første kort (hvis den findes
  // og ikke er den nuværende side). Det giver hver indekseret prisguide et
  // direkte link til sin hub, så Google opdager hub-siderne hurtigt.
  const HUB_BY_CATEGORY: Record<string, string> = {
    "Rengøring": "/guides/rengoering",
    "Flyttehjælp": "/guides/flytning",
    "Håndværker": "/guides/haandvaerker",
    "Tømrer": "/guides/haandvaerker",
    "Murer": "/guides/haandvaerker",
    "Maler": "/guides/haandvaerker",
    "Elektriker": "/guides/haandvaerker",
    "VVS": "/guides/haandvaerker",
    "Gulvlægger": "/guides/haandvaerker",
    "Haveservice": "/guides/have",
    "Anlægsgartner": "/guides/have",
    "Økonomi": "/guides/priser-2026",
  };
  const forcedHubHref = category ? HUB_BY_CATEGORY[category] : undefined;

  const relatedGuides = (() => {
    const hubFirst = forcedHubHref
      ? GUIDES.filter((g) => g.href === forcedHubHref && g.href !== currentPath)
      : [];
    const same = GUIDES.filter(
      (g) => g.category === category && g.href !== currentPath && g.href !== forcedHubHref,
    );
    const others = GUIDES.filter(
      (g) => g.category !== category && g.href !== currentPath && g.href !== forcedHubHref,
    );
    return [...hubFirst, ...same, ...others].slice(0, 3);
  })();

  const relatedPosts = (() => {
    const same = BLOG_POSTS.filter((p) => p.category === category && `/blog/${p.slug}` !== currentPath);
    const others = BLOG_POSTS.filter((p) => p.category !== category && `/blog/${p.slug}` !== currentPath);
    return [...same, ...others].slice(0, 3);
  })();

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
    </aside>
  );
};

export default RelatedContent;