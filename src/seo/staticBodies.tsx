// Kun til build: laver statisk HTML-indhold pr. offentlig side, som lægges i
// #root i den forudrenderede HTML. React erstatter det ved mount, så brugere
// ser intet forskelligt — men crawlere får rigtig tekst og interne links.
import { relatedContent } from "./related-content";
export { missingIndexableContent } from "./indexable-routes";
import { LegacyCityBody, legacyCityGroups } from "./LegacyCityBody";
import { Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { BLOG_POSTS } from "@/pages/blog/blogPosts";
import { GUIDES } from "@/pages/guides/guidesRegistry";
import { SOFTWARE_PAGES } from "@/pages/software/softwareRegistry";
import { INDUSTRIES, industryConfig } from "@/pages/software/industryRegistry";
import type { BlogPostConfig } from "@/pages/blog/defineBlogPost";
import type { GuideConfig } from "@/pages/guides/defineGuidePage";
import type { SoftwareConfig } from "@/pages/software/defineSoftwarePage";
import { GuideBody, SoftwareBody } from "./contentBodies";
import { BLOG_CATEGORIES, normalizeCategory } from "@/pages/blog/blogCategories";
import { CITY_FACTS } from "@/pages/cities/cityFacts";
import { BRANCHES, branchCities } from "@/pages/cities/branchRegistry";
import { servicesForCity } from "@/pages/cities/cityServices";
import { LocalServiceLinks } from "@/pages/cities/LocalServiceLinks";
import { CityFactsBox } from "@/pages/cities/CityFactsBox";
import BranchQuickAnswer from "@/pages/cities/BranchQuickAnswer";
import { PLANNER_FEATURES } from "@/data/routePlannerFeatures";

const contentLoaders = import.meta.glob<{ default: { seoConfig?: GuideConfig | SoftwareConfig } }>([
  "/src/pages/guides/*.tsx", "/src/pages/software/*.tsx",
  "!/src/pages/guides/defineGuidePage.tsx", "!/src/pages/software/defineSoftwarePage.tsx",
]);

export const staticContentMetadata: Record<string, { title: string; description: string }> = {};

const SITE_LINKS: [string, string][] = [
  ["/", "Forside"],
  ["/virksomheder", "Find serviceydere"],
  ["/tilbud", "Få 3 gratis tilbud"],
  ["/guides", "Guides og priser"],
  ["/blog", "Blog"],
  ["/by", "Alle byer"],
  ["/software", "System til servicefirmaer"],
  ["/software/ruteplanlaegger", "Ruteplanlægger"],
  ["/opret-virksomhed", "Prøv gratis i 30 dage"],
];

const Nav = ({ extra = [] as [string, string][] }) => (
  <nav aria-label="Mere fra Serviceydere">
    <ul>
      {Array.from(new Map([...extra, ...SITE_LINKS].map(link => [link[0], link])).values()).map(([href, label]) => (
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
  const configs = new Map<string, GuideConfig | SoftwareConfig>();
  for (const load of Object.values(contentLoaders)) {
    const config = (await load()).default?.seoConfig;
    if (config) {
      configs.set(config.canonicalPath, config);
      staticContentMetadata[config.canonicalPath] = { title: config.metaTitle, description: config.metaDescription };
    }
  }
  for (const industry of INDUSTRIES) {
    const config = industryConfig(industry);
    configs.set(config.canonicalPath, config);
    staticContentMetadata[config.canonicalPath] = { title: config.metaTitle, description: config.metaDescription };
  }
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
      const selection = relatedContent(p.category, path);
      const related = selection.posts.map(o => [`/blog/${o.slug}`, o.title] as [string, string]);
      const category = BLOG_CATEGORIES.find(c => c.name === normalizeCategory(p.category));
      const guides = selection.guides.map(g => [g.href, g.title] as [string, string]);
      render(path, (
        <>
          {cfg ? <PostBody title={p.title} description={p.description} cfg={cfg} /> : (<><h1>{p.title}</h1><p>{p.description}</p></>)}
          <Nav extra={[...(category ? [[`/blog/kategori/${category.slug}`, `Alle artikler om ${category.name}`] as [string, string]] : []), ...guides, ...related]} />
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
  for (const category of BLOG_CATEGORIES) {
    render(`/blog/kategori/${category.slug}`, <>
      <h1>{category.name} – artikler og guides</h1>
      <ul>{BLOG_POSTS.filter(post => normalizeCategory(post.category) === category.name).map(post => <li key={post.slug}>
        <a href={`/blog/${post.slug}`}>{post.title}</a><p>{post.description}</p>
      </li>)}</ul>
      <Nav extra={GUIDES.filter(guide => normalizeCategory(guide.category) === category.name).map(guide => [guide.href, guide.title])} />
    </>);
  }
  render("/guides", (
    <>
      <h1>Guides og prisguides 2026</h1>
      <ul>{GUIDES.map((g) => <li key={g.href}><a href={g.href}>{g.title}</a> — {g.desc}</li>)}</ul>
      <Nav />
    </>
  ));
  for (const g of GUIDES) {
    const config = configs.get(g.href);
    render(g.href, (
      <>
        {config && "priceTable" in config ? <GuideBody config={config} /> : <><h1>{g.title}</h1><p>{g.desc}</p></>}
        <Nav extra={[
          ...GUIDES.filter(o => o.href !== g.href && o.category === g.category).map(o => [o.href, o.title] as [string, string]),
          ...BLOG_POSTS.filter(post => normalizeCategory(post.category) === normalizeCategory(g.category)).map(post => [`/blog/${post.slug}`, post.title] as [string, string]),
        ]} />
      </>
    ));
  }
  for (const s of SOFTWARE_PAGES) {
    const config = configs.get(s.href);
    render(s.href, (
      <>
        {config && "answer" in config ? <SoftwareBody config={config} /> : <>
          <h1>{s.seoTitle?.replace(/\s*\|.*$/, "") ?? s.label}</h1>
          <p>{s.seoDescription ?? s.blurb}</p>
        </>}
        {s.href === "/software/funktioner" && <>{PLANNER_FEATURES.map(feature => <section key={feature.id} id={feature.id}>
          <h2>{feature.title}</h2><p>{feature.summary}</p><h3>Eksempel</h3><p>{feature.example}</p>
          <ol>{feature.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
        </section>)}</>}
        <p>Prøv Serviceydere gratis i 30 dage. Du skal ikke bruge kreditkort.</p>
        <Nav extra={[
          ...SOFTWARE_PAGES.filter((o) => o.href !== s.href && (o.group !== "branch" || s.group === "branch" || s.href === "/software/brancher")).map((o) => [o.href, o.label] as [string, string]),
          ...BLOG_POSTS.filter((p) => p.category === "Ruteplanlægning").map((p) => [`/blog/${p.slug}`, p.title] as [string, string]),
        ]} />
      </>
    ));
  }
  render("/by", <><h1>Find serviceydere i din by</h1><Nav extra={CITY_FACTS.map(city => [`/by/${city.slug}`, city.name])} /></>);
  for (const city of CITY_FACTS) {
    render(`/by/${city.slug}`, <><h1>Serviceydere i {city.name}</h1>
      <p>Se lokale services og prisguides i {city.name} og {city.region}.</p>
      <CityFactsBox slug={city.slug} name={city.name} />
      <Nav extra={servicesForCity(city.slug).map(service => [service.href, `${service.label} i ${city.name}`])} />
    </>);
  }
  for (const branch of BRANCHES) {
    for (const city of branchCities(branch)) {
      render(`/${branch.kind}/${city.slug}`, <article>
        <h1>{branch.label} i {city.name}</h1>
        <BranchQuickAnswer branch={branch} city={city} />
        <p>{city.intro}</p><p>{city.localFactor}</p>
        <h2>Typiske priser i {city.name}</h2>
        <table><thead><tr><th>Opgave</th><th>Vejledende pris</th></tr></thead><tbody>{branch.rows(city).map(([label, price]) => <tr key={label}><td>{label}</td><td>{price}</td></tr>)}</tbody></table>
        <h2>Opgaver</h2><ul>{branch.tasks.map(task => <li key={task}>{task}</li>)}</ul>
        <h2>Områder i og omkring {city.name}</h2><p>{city.areas.join(" · ")}</p>
        <h2>Fradrag</h2><p>{branch.deduction}</p>
        <CityFactsBox slug={city.slug} name={city.name} />
        <LocalServiceLinks slug={city.slug} name={city.name} currentPath={`/${branch.kind}/${city.slug}`} />
        <Nav extra={[[branch.priceGuide, `${branch.label} – prisguide`], [`/by/${city.slug}`, `Alle services i ${city.name}`],
          ...branchCities(branch).filter(other => other.slug !== city.slug).map(other => [`/${branch.kind}/${other.slug}`, `${branch.label} i ${other.name}`] as [string, string])]} />
      </article>);
    }
  }
  for (const group of legacyCityGroups) {
    for (const city of group.cities) render(`/${group.kind}/${city.slug}`, <LegacyCityBody kind={group.kind} city={city} />);
  }
  return out;
}
