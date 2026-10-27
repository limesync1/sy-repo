// Kun til build: laver statisk HTML-indhold pr. offentlig side, som lægges i
// #root i den forudrenderede HTML. React erstatter det ved mount, så brugere
// ser intet forskelligt — men crawlere får rigtig tekst og interne links.
import { Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { BLOG_POSTS } from "@/pages/blog/blogPosts";
import { GUIDES } from "@/pages/guides/guidesRegistry";
import { SOFTWARE_PAGES } from "@/pages/software/softwareRegistry";
import type { BlogPostConfig } from "@/pages/blog/defineBlogPost";

const SITE_LINKS: [string, string][] = [
  ["/", "Forside"],
  ["/virksomheder", "Find serviceydere"],
  ["/tilbud", "Få 3 gratis tilbud"],
  ["/guides", "Guides og priser"],
  ["/blog", "Blog"],
  ["/by", "Alle byer"],
  ["/software", "System til servicefirmaer"],
  ["/software/ruteplanlaegger", "Ruteplanlægger"],
  ["/opret-virksomhed", "Prøv gratis i 14 dage"],
];

const Nav = ({ extra = [] as [string, string][] }) => (
  <nav aria-label="Mere fra Serviceydere">
    <ul>
      {[...extra, ...SITE_LINKS].map(([href, label]) => (
        <li key={href + label}><a href={href}>{label}</a></li>
      ))}
    </ul>
  </nav>
);

const PostBody = ({ title, description, cfg }: { title: string; description: string; cfg: BlogPostConfig }) => (
  <article>
    <h1>{title}</h1>
    <p>{description}</p>
    {cfg.sections.map((s, i) => (
      <Fragment key={i}>
        {s.heading && <h2>{s.heading}</h2>}
        {s.paragraphs?.map((p, j) => <p key={j}>{p}</p>)}
        {s.list && <ul>{s.list.map((li, j) => <li key={j}>{li}</li>)}</ul>}
        {s.ordered && <ol>{s.ordered.map((li, j) => <li key={j}>{li}</li>)}</ol>}
        {s.body}
      </Fragment>
    ))}
    {cfg.faq && cfg.faq.length > 0 && (
      <section>
        <h2>Ofte stillede spørgsmål</h2>
        {cfg.faq.map((f) => (
          <Fragment key={f.q}><h3>{f.q}</h3><p>{f.a}</p></Fragment>
        ))}
      </section>
    )}
  </article>
);

/** path → HTML. Fejl i én side springes over, så build aldrig stopper. */
export async function renderStaticBodies(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const render = (path: string, node: JSX.Element) => {
    try {
      out[path] = renderToStaticMarkup(<StaticRouter location={path}>{node}</StaticRouter>);
    } catch (e) {
      console.warn(`static body skipped for ${path}:`, (e as Error).message);
    }
  };

  for (const p of BLOG_POSTS) {
    const path = `/blog/${p.slug}`;
    try {
      const mod: any = await p.loader();
      const cfg: BlogPostConfig | undefined = mod?.default?.seoConfig;
      const related = BLOG_POSTS.filter((o) => o.slug !== p.slug && o.category === p.category)
        .slice(0, 6).map((o) => [`/blog/${o.slug}`, o.title] as [string, string]);
      render(path, (
        <>
          {cfg ? <PostBody title={p.title} description={p.description} cfg={cfg} /> : (<><h1>{p.title}</h1><p>{p.description}</p></>)}
          <Nav extra={related} />
        </>
      ));
    } catch (e) {
      console.warn(`static body skipped for ${path}:`, (e as Error).message);
    }
  }

  // Oversigter: rigtige links, så alle artikler og guides kan findes uden JS.
  render("/blog", (
    <>
      <h1>Blog – råd om rengøring, håndværk, flytning, have og ruteplanlægning</h1>
      <ul>{BLOG_POSTS.map((p) => <li key={p.slug}><a href={`/blog/${p.slug}`}>{p.title}</a> — {p.description}</li>)}</ul>
      <Nav />
    </>
  ));
  render("/guides", (
    <>
      <h1>Guides og prisguides 2026</h1>
      <ul>{GUIDES.map((g) => <li key={g.href}><a href={g.href}>{g.title}</a> — {g.desc}</li>)}</ul>
      <Nav />
    </>
  ));
  for (const g of GUIDES) {
    render(g.href, (
      <>
        <h1>{g.title}</h1>
        <p>{g.desc}</p>
        <Nav extra={GUIDES.filter((o) => o.href !== g.href).slice(0, 8).map((o) => [o.href, o.title] as [string, string])} />
      </>
    ));
  }
  for (const s of SOFTWARE_PAGES) {
    const anyS = s as any;
    render(s.href, (
      <>
        <h1>{anyS.seoTitle?.replace(/\s*\|.*$/, "") ?? s.label}</h1>
        <p>{anyS.seoDescription ?? anyS.blurb}</p>
        <p>Prøv Serviceydere gratis i 14 dage. Du skal ikke bruge kreditkort, og prøveperioden stopper af sig selv.</p>
        <Nav extra={[
          ...SOFTWARE_PAGES.filter((o) => o.href !== s.href).map((o) => [o.href, o.label] as [string, string]),
          ...BLOG_POSTS.filter((p) => p.category === "Ruteplanlægning").map((p) => [`/blog/${p.slug}`, p.title] as [string, string]),
        ]} />
      </>
    ));
  }
  return out;
}
