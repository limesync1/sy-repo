import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BlogArticleLayout from "./BlogArticleLayout";
import NotFound from "../NotFound";
import type { BlogPostMeta } from "./blogPosts";

type Section = { summary?: string; heading?: string; paragraphs?: string[]; list?: string[]; table?: { headers: string[]; rows: string[][] }; links?: { label: string; href: string }[] };

/** Turns `[label](/internal-path)` into router links; anything else stays plain text. */
const inline = (text: string) =>
  text.split(/(\[[^\]]+\]\([^)\s]+\))/g).map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (!m) return part;
    return m[2].startsWith("/") ? <Link key={i} to={m[2]}>{m[1]}</Link> : m[1];
  });

/** Renders articles written by the automatic SEO engine (stored as plain-text blocks, never HTML). */
const DynamicBlogPost = () => {
  const { slug = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["seo-article", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("seo_articles").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60_000,
  });
  if (isLoading) return <div className="min-h-screen bg-background" aria-busy="true" />;
  if (!data) return <NotFound />;

  const post = {
    slug: data.slug, title: data.title, description: data.description, category: data.category,
    publishedAt: (data.published_at ?? data.created_at).slice(0, 10), updatedAt: data.updated_at.slice(0, 10),
    readingMinutes: data.reading_minutes, loader: async () => ({ default: () => null }),
  } as BlogPostMeta;
  const sections = (data.sections ?? []) as Section[];
  const faq = (data.faq ?? []) as { q: string; a: string }[];

  return (
    <BlogArticleLayout post={post} keywords={data.keywords} faq={faq}>
      {sections.map((s, i) => (
        s.summary ? (
          <aside key={i} className="not-prose my-6 rounded-lg border border-border bg-primary/5 p-5">
            <p className="m-0 text-sm font-semibold text-foreground">Kort svar</p>
            <p className="mt-1 text-base leading-relaxed text-foreground">{s.summary}</p>
          </aside>
        ) : (
        <section key={i}>
          {s.heading && <h2>{s.heading}</h2>}
          {s.paragraphs?.map((p, j) => <p key={j}>{inline(p)}</p>)}
          {s.list?.length ? <ul>{s.list.map((l, j) => <li key={j}>{inline(l)}</li>)}</ul> : null}
          {s.table?.headers?.length ? (
            <div className="overflow-x-auto">
              <table>
                <thead><tr>{s.table.headers.map((h, j) => <th key={j}>{h}</th>)}</tr></thead>
                <tbody>{s.table.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          ) : null}
          {s.links?.length ? (
            <ul>{s.links.filter((l) => l.href.startsWith("/")).map((l, j) => <li key={j}><Link to={l.href}>{l.label}</Link></li>)}</ul>
          ) : null}
        </section>
        )
      ))}
    </BlogArticleLayout>
  );
};

export default DynamicBlogPost;
