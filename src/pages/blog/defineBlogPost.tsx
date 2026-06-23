import { Fragment, ReactNode } from "react";
import BlogArticleLayout from "./BlogArticleLayout";
import { findBlogPost } from "./blogPosts";

/**
 * En sektion i et blogopslag. Tre måder at angive indhold på, fra simpel
 * datadrevet til fuld JSX-frihed:
 *   - `paragraphs` + `list`/`ordered`   → ren data, nemmest at vedligeholde
 *   - `body`                            → rå JSX, fuld kontrol
 * Begge kan kombineres på samme sektion.
 */
export interface BlogSection {
  heading?: string;
  /** Brødtekst, hver post bliver til en `<p>`. */
  paragraphs?: ReactNode[];
  /** Punktopstilling. */
  list?: ReactNode[];
  /** Nummereret liste. */
  ordered?: ReactNode[];
  /** Hvis du har brug for fri JSX (callouts, tabeller, billeder). */
  body?: ReactNode;
}

export interface BlogPostConfig {
  /** Slug — skal være registreret i `blogPosts.ts` så meta/SEO virker. */
  slug: string;
  /** SEO-keywords kommasepareret (samme som BlogArticleLayout `keywords`). */
  keywords: string;
  /** FAQ-sektion. Renderes både visuelt og som FAQPage JSON-LD. */
  faq?: { q: string; a: string }[];
  /** Indhold opdelt i sektioner. */
  sections: BlogSection[];
}

/**
 * CMS-lignende factory til blogopslag. Et nyt opslag oprettes nu med ren
 * data — uden manuel JSX, uden manuel SEO og uden manuel JSON-LD. Slug skal
 * først tilføjes i `blogPosts.ts` (én sandhed for metadata).
 *
 * Eksempel:
 *   const Post = defineBlogPost({
 *     slug: "min-nye-artikel",
 *     keywords: "...",
 *     faq: [{ q: "?", a: "..." }],
 *     sections: [{ heading: "Intro", paragraphs: ["Tekst."] }],
 *   });
 */
export function defineBlogPost(cfg: BlogPostConfig) {
  const post = findBlogPost(cfg.slug);
  if (!post) {
    throw new Error(
      `defineBlogPost: ukendt slug "${cfg.slug}". Tilføj først meta i src/pages/blog/blogPosts.ts.`,
    );
  }

  const Page = () => (
    <BlogArticleLayout post={post} keywords={cfg.keywords} faq={cfg.faq}>
      {cfg.sections.map((s, i) => (
        <Fragment key={i}>
          {s.heading && <h2>{s.heading}</h2>}
          {s.paragraphs?.map((p, j) => (
            <p key={`p-${j}`}>{p}</p>
          ))}
          {s.list && (
            <ul>
              {s.list.map((li, j) => (
                <li key={`li-${j}`}>{li}</li>
              ))}
            </ul>
          )}
          {s.ordered && (
            <ol>
              {s.ordered.map((li, j) => (
                <li key={`oi-${j}`}>{li}</li>
              ))}
            </ol>
          )}
          {s.body}
        </Fragment>
      ))}
    </BlogArticleLayout>
  );
  Page.displayName = `BlogPost(${cfg.slug})`;
  return Page;
}