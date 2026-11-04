// Genererer public/sitemap.xml så /sitemap.xml returnerer 200 fra Lovable
// hosting. Den dynamiske edge function (sitemap) bruges stadig som fuld
// sitemap med alle virksomheder — vi henviser til begge fra robots.txt.

import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { resolve } from "path";
import { BLOG_POSTS } from "../src/pages/blog/blogPosts";
import { BLOG_CATEGORIES } from "../src/pages/blog/blogCategories";
import { GUIDES } from "../src/pages/guides/guidesRegistry";
import { CITIES } from "../src/pages/cities/cleaningCityData";
import { MOVING_CITIES } from "../src/pages/cities/movingCityData";
import { HANDYMAN_CITIES } from "../src/pages/cities/handymanCityData";
import { GARDEN_CITIES } from "../src/pages/cities/gardenCityData";
import { BRANCHES, branchCities } from "../src/pages/cities/branchRegistry";
import { CITY_FACTS } from "../src/pages/cities/cityFacts";
import { servicesForCity } from "../src/pages/cities/cityServices";
import { SOFTWARE_PAGES } from "../src/pages/software/softwareRegistry";
import { citySeo, type LegacyCityKind } from "../src/seo/city-seo";
import heroPhotos from "../src/components/landing/hero-photo-data.json";

const BASE_URL = "https://serviceydere.dk";
const ARTICLE_IMG_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZWN0c2VsbGtwbHRyeHZ1c290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTkxMDYsImV4cCI6MjA5MTU5NTEwNn0.VxLbs00qkZXCiNa468aHEC9FJhoY3Gyik0D8dKBdq_c";

// Lastmod kommer kun fra sidespecifikke kilder; hverken sider eller
// sitemap-index får et build-tidsstempel som kunstigt friskhedssignal.

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  lastmod?: string;
}

const STATIC_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/virksomheder", changefreq: "daily", priority: "0.9" },
  { path: "/tilbud", changefreq: "weekly", priority: "0.9" },
  { path: "/rengoering", changefreq: "weekly", priority: "0.9" },
  { path: "/opret-virksomhed", changefreq: "monthly", priority: "0.7" },
  { path: "/hjaelp", changefreq: "monthly", priority: "0.5" },
  { path: "/guides", changefreq: "weekly", priority: "0.8" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
  { path: "/privatlivspolitik", changefreq: "yearly", priority: "0.3" },
  { path: "/vilkaar", changefreq: "yearly", priority: "0.3" },
  { path: "/slet-data", changefreq: "yearly", priority: "0.3" },
  { path: "/databehandleraftale", changefreq: "yearly", priority: "0.3" },
  { path: "/underdatabehandlere", changefreq: "yearly", priority: "0.3" },
  { path: "/om-os", changefreq: "monthly", priority: "0.5" },
  { path: "/redaktion", changefreq: "monthly", priority: "0.4" },
  { path: "/anmeldelser", changefreq: "weekly", priority: "0.6" },
  { path: "/kontakt", changefreq: "monthly", priority: "0.5" },
];

// Auto-genereret fra de centrale data-kilder. Tilføj et opslag/guide/by
// dér og det dukker automatisk op her — ingen manuel sync nødvendig.
const GUIDE_ENTRIES: SitemapEntry[] = GUIDES.map((g) => ({
  path: g.href,
  changefreq: "monthly",
  priority: g.priority ?? "0.8",
  lastmod: g.updatedAt,
}));

const BLOG_ENTRIES: SitemapEntry[] = BLOG_POSTS.map((p) => ({
  path: `/blog/${p.slug}`,
  changefreq: "monthly",
  priority: "0.75",
  lastmod: p.updatedAt ?? p.publishedAt,
}));

// Kategori-indekser (/blog/kategori/:slug) – én pr. blog-kategori med
// mindst 1 artikel. Giver topic-clusters et indekserbart entry point.
const BLOG_CATEGORY_ENTRIES: SitemapEntry[] = BLOG_CATEGORIES.map((c) => ({
  path: `/blog/kategori/${c.slug}`,
  changefreq: "weekly",
  priority: "0.7",
}));

const CITY_ENTRIES: SitemapEntry[] = [
  ...CITIES.map((c) => ({ path: `/rengoering/${c.slug}`, changefreq: "weekly" as const, priority: "0.8" })),
  ...MOVING_CITIES.map((c) => ({ path: `/flyttehjaelp/${c.slug}`, changefreq: "weekly" as const, priority: "0.8" })),
  ...HANDYMAN_CITIES.map((c) => ({ path: `/haandvaerker/${c.slug}`, changefreq: "weekly" as const, priority: "0.8" })),
  ...GARDEN_CITIES.map((c) => ({ path: `/haveservice/${c.slug}`, changefreq: "weekly" as const, priority: "0.8" })),
  ...BRANCHES.flatMap((b) => branchCities(b).map((c) => ({ path: `/${b.kind}/${c.slug}`, changefreq: "weekly" as const, priority: "0.8" }))),
  { path: "/by", changefreq: "weekly" as const, priority: "0.7" },
  ...CITY_FACTS.map((c) => ({ path: `/by/${c.slug}`, changefreq: "weekly" as const, priority: "0.7" })),
];

// Offentlige produktsider (/software/*) — én sandhed i softwareRegistry.
const SOFTWARE_ENTRIES: SitemapEntry[] = SOFTWARE_PAGES.map((p) => ({
  path: p.href,
  changefreq: "monthly",
  priority: p.priority ?? "0.8",
}));

const entries: SitemapEntry[] = [
  ...STATIC_ENTRIES,
  ...SOFTWARE_ENTRIES,
  ...GUIDE_ENTRIES,
  ...BLOG_ENTRIES,
  ...CITY_ENTRIES,
];

// Med vilje udeladt fra sitemap: /reset-password, /admin, /virksomhed,
// /virksomhed/ruter, /medarbejder. Disse er auth-gated private ruter
// (virksomhedspanel, ruteplanlægger, medarbejder-app, password reset link)
// som ikke skal indekseres af søgemaskiner.

const CATEGORIES = [
  "Rengøring", "Håndværker", "Flyttehjælp", "Haveservice",
  "Maler", "VVS", "Elektriker", "Tømrer", "Sikkerhed",
];

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const toUrls = (es: SitemapEntry[]) =>
  es.map((e) => ({
    loc: `${BASE_URL}${e.path}`,
    changefreq: e.changefreq,
    priority: e.priority,
    lastmod: e.lastmod,
  }));

// Article cover images (generated by the article-images worker) → <image:image> so Google Images finds them.
const ARTICLE_IMAGES = new Map<string, { url: string; alt: string | null }>();
try {
  const res = await fetch("https://gkectsellkpltrxvusot.supabase.co/rest/v1/article_images?select=path,image_url,alt&status=eq.done&limit=5000", {
    headers: { apikey: ARTICLE_IMG_KEY, Authorization: `Bearer ${ARTICLE_IMG_KEY}` },
    signal: AbortSignal.timeout(15000),
  });
  if (res.ok) for (const r of (await res.json()) as { path: string; image_url: string; alt: string | null }[]) ARTICLE_IMAGES.set(r.path, { url: r.image_url, alt: r.alt });
} catch (e) {
  console.warn("article image fetch skipped:", (e as Error).message);
}

type EngineSection = { summary?: string; heading?: string; paragraphs?: string[]; list?: string[]; table?: { headers: string[]; rows: string[][] }; links?: { label: string; href: string }[] };
const esc = (t: string) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Plain-text engine blocks → crawlable HTML (markdown links become internal anchors; never raw HTML). */
const inlineHtml = (t: string) => esc(t).replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, (_m, l, h) => `<a href="${h}">${l}</a>`);
const engineBody = (title: string, description: string, sections: EngineSection[], faq: { q: string; a: string }[]) => [
  `<article><h1>${esc(title)}</h1><p>${esc(description)}</p>`,
  ...sections.map((s) => s.summary ? `<aside><p><strong>Kort svar:</strong> ${esc(s.summary)}</p></aside>` : [
    s.heading ? `<h2>${esc(s.heading)}</h2>` : "",
    ...(s.paragraphs ?? []).map((x) => `<p>${inlineHtml(x)}</p>`),
    s.list?.length ? `<ul>${s.list.map((x) => `<li>${inlineHtml(x)}</li>`).join("")}</ul>` : "",
    s.table?.headers?.length ? `<table><thead><tr>${s.table.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${s.table.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>` : "",
    s.links?.length ? `<ul>${s.links.filter((l) => l.href.startsWith("/")).map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join("")}</ul>` : "",
  ].join("")),
  faq.length ? `<h2>Ofte stillede spørgsmål</h2>${faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join("")}` : "",
  `</article>`,
].join("");

// Published engine articles (seo_articles) so new automatic articles are in the submitted sitemap; lastmod = their own updated_at.
const ENGINE_ENTRIES: SitemapEntry[] = [];
const ENGINE_META: { path: string; title: string; description: string; body: string; article: { title: string; publishedAt: string; updatedAt: string } }[] = [];
try {
  const res = await fetch("https://gkectsellkpltrxvusot.supabase.co/rest/v1/seo_articles?select=slug,title,description,published_at,updated_at,sections,faq&status=eq.published&limit=5000", {
    headers: { apikey: ARTICLE_IMG_KEY, Authorization: `Bearer ${ARTICLE_IMG_KEY}` },
    signal: AbortSignal.timeout(15000),
  });
  const known = new Set(BLOG_ENTRIES.map((e) => e.path));
  if (res.ok) for (const a of (await res.json()) as { slug: string; title: string; description: string; published_at: string | null; updated_at: string; sections: EngineSection[] | null; faq: { q: string; a: string }[] | null }[]) {
    const path = `/blog/${a.slug}`;
    if (!/^[a-z0-9-]+$/.test(a.slug) || known.has(path)) continue;
    ENGINE_ENTRIES.push({ path, changefreq: "monthly", priority: "0.75", lastmod: a.updated_at.slice(0, 10) });
    const publishedAt = (a.published_at ?? a.updated_at).slice(0, 10);
    ENGINE_META.push({ path, title: `${a.title} | Serviceydere`, description: a.description, body: engineBody(a.title, a.description, a.sections ?? [], a.faq ?? []), article: { title: a.title, publishedAt, updatedAt: a.updated_at.slice(0, 10) } });
  }
} catch (e) {
  console.warn("seo article fetch skipped:", (e as Error).message);
}

const buildUrlset = (urls: ReturnType<typeof toUrls>) =>
  [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    ...urls.map((u) =>
      [
        `  <url>`,
        `    <loc>${escapeXml(u.loc)}</loc>`,
        ...(u.loc === `${BASE_URL}/` ? heroPhotos.map(photo => `    <image:image><image:loc>${escapeXml(new URL(photo.src, BASE_URL).href)}</image:loc></image:image>`) : []),
        ...(() => { const img = ARTICLE_IMAGES.get(u.loc.slice(BASE_URL.length)); return img ? [`    <image:image><image:loc>${escapeXml(img.url)}</image:loc>${img.alt ? `<image:title>${escapeXml(img.alt)}</image:title>` : ""}</image:image>`] : []; })(),
        u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : null,
        u.changefreq ? `    <changefreq>${u.changefreq}</changefreq>` : null,
        u.priority ? `    <priority>${u.priority}</priority>` : null,
        `  </url>`,
      ].filter(Boolean).join("\n"),
    ),
    `</urlset>`,
  ].join("\n");

// Opdel i tematiske sitemaps + et sitemap-index. Giver Google bedre
// crawl-budget pr. type (pages/blog/cities/guides) og isolerer fejl —
// hvis ét sitemap har problemer påvirker det ikke de andre.
const pagesUrls = toUrls([
  ...STATIC_ENTRIES,
  ...SOFTWARE_ENTRIES,
  ...CATEGORIES.map((c) => ({
    path: `/virksomheder?category=${encodeURIComponent(c)}`,
    changefreq: "weekly" as const,
    priority: "0.7",
  })),
]);
const blogUrls = toUrls([...BLOG_ENTRIES, ...ENGINE_ENTRIES, ...BLOG_CATEGORY_ENTRIES]);
const guidesUrls = toUrls(GUIDE_ENTRIES);
const citiesUrls = toUrls(CITY_ENTRIES);

writeFileSync(resolve("public/sitemap-pages.xml"), buildUrlset(pagesUrls));
writeFileSync(resolve("public/sitemap-blog.xml"), buildUrlset(blogUrls));
writeFileSync(resolve("public/sitemap-guides.xml"), buildUrlset(guidesUrls));
writeFileSync(resolve("public/sitemap-cities.xml"), buildUrlset(citiesUrls));

// Behold legacy /sitemap.xml som fuld urlset så ældre referencer + GSC's
// eksisterende submitted sitemap fortsætter med at virke uden re-submit.
// Nye konsumenter bør bruge /sitemap-index.xml.
const allUrls = [...pagesUrls, ...blogUrls, ...guidesUrls, ...citiesUrls];
writeFileSync(resolve("public/sitemap.xml"), buildUrlset(allUrls));

const writeSitemapIndex = () => {
  const sitemapFiles = ["sitemap-pages.xml", "sitemap-blog.xml", "sitemap-guides.xml", "sitemap-cities.xml"];
  try {
    const businessSitemap = readFileSync(resolve("public/sitemap-businesses.xml"), "utf8");
    if (businessSitemap.includes("<url>")) sitemapFiles.push("sitemap-businesses.xml");
  } catch {
    // Ingen aktive virksomhedssider endnu — undlad et tomt child-sitemap.
  }
  const indexXml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...sitemapFiles.map(
      (name) => `  <sitemap><loc>${BASE_URL}/${name}</loc></sitemap>`,
    ),
    `</sitemapindex>`,
  ].join("\n");
  writeFileSync(resolve("public/sitemap-index.xml"), indexXml);
};

console.log(
  `sitemaps written — pages:${pagesUrls.length} blog:${blogUrls.length} guides:${guidesUrls.length} cities:${citiesUrls.length} (legacy sitemap.xml:${allUrls.length})`,
);
// ── Statisk <head> pr. rute ─────────────────────────────────────────────
// Skriver titel/beskrivelse pr. offentlig rute til en JSON-fil, som
// vite-pluginet "seo-prerender-head" bruger til at lave dist/<rute>/index.html
// med egen title, description, canonical og og:* — så crawlere der ikke
// kører JavaScript ikke ser forsidens metadata på alle sider.
const cityMeta = (base: LegacyCityKind, _label: string, list: { slug: string; name: string; hourlyLow: number; hourlyHigh: number }[]) =>
  list.map(c => citySeo(base, c));
const STATIC_META = [
  { path: "/virksomheder", title: "Find serviceydere nær dig – sammenlign og book | Serviceydere", description: "Se verificerede firmaer til rengøring, håndværk, flytning, haveservice og meget mere. Sammenlign anmeldelser og priser, og book direkte." },
  { path: "/tilbud", title: "Få 3 gratis tilbud fra lokale firmaer | Serviceydere", description: "Beskriv din opgave én gang og få op til 3 gratis, uforpligtende tilbud fra verificerede lokale serviceydere." },
  { path: "/opret-virksomhed", title: "Opret din servicevirksomhed – få nye kunder | Serviceydere", description: "Bliv udbyder på Serviceydere: få nye kunder, ruteplanlægning, medarbejder-app og fakturering i ét system. 14 dages gratis prøve." },
  { path: "/hjaelp", title: "Hjælp og ofte stillede spørgsmål | Serviceydere", description: "Svar på spørgsmål om bestilling, betaling, tilbud og brug af Serviceydere for kunder og virksomheder." },
  { path: "/guides", title: "Prisguides og guides til services 2026 | Serviceydere", description: "Prisguides for rengøring, håndværker, flytning, have og mere – med vejledende priser for 2026 og råd til at vælge det rigtige firma." },
  { path: "/blog", title: "Blog – råd om rengøring, håndværk, flytning og have | Serviceydere", description: "Artikler med konkrete priser, tjeklister og råd til husejere, lejere og servicevirksomheder." },
  { path: "/cookies", title: "Cookiepolitik | Serviceydere", description: "Sådan bruger Serviceydere cookies, og hvordan du ændrer dine valg." },
  { path: "/privatlivspolitik", title: "Privatlivspolitik | Serviceydere", description: "Sådan behandler Serviceydere dine personoplysninger, og hvilke rettigheder du har." },
  { path: "/vilkaar", title: "Vilkår og betingelser | Serviceydere", description: "Vilkår for brug af Serviceydere for kunder og virksomheder." },
  { path: "/slet-data", title: "Slet data og tilbagekald samtykke | Serviceydere", description: "Slet cookievalg, anmod om sletning af konto og personoplysninger eller fjern virksomhedsdata hos Serviceydere." },
  { path: "/databehandleraftale", title: "Databehandleraftale | Serviceydere", description: "Databehandleraftale mellem Serviceydere og virksomheder, der bruger platformen til kunder, ruter og fakturering." },
  { path: "/underdatabehandlere", title: "Underdatabehandlere | Serviceydere", description: "Oversigt over de underdatabehandlere, Serviceydere bruger til drift, hosting, betaling og kommunikation." },
  { path: "/redaktion", title: "Redaktionen bag Serviceyderes guides og artikler | Serviceydere", description: "Sådan skriver, tjekker og opdaterer Serviceyderes redaktion guides om priser, regler og servicearbejde i Danmark." },
  { path: "/om-os", title: "Om Serviceydere – platformen bag lokale services | Serviceydere", description: "Læs om Serviceydere: platformen der forbinder kunder med lokale servicevirksomheder og giver virksomheder ruteplanlægning, booking og fakturering." },
  { path: "/anmeldelser", title: "Anmeldelser fra kunder og virksomheder | Serviceydere", description: "Se anmeldelser af servicevirksomheder på Serviceydere – rigtige opgaver, rigtige kunder." },
  { path: "/kontakt", title: "Kontakt Serviceydere | Serviceydere", description: "Kontakt Serviceydere – få hjælp til booking, tilbud eller din virksomhedskonto." },
  { path: "/rengoering", title: "Find rengøringsvirksomhed i din by — se priser | Serviceydere", description: "Søg efter rengøringsfirmaer i din by og se lokale priser på privat- og erhvervsrengøring. Sammenlign og få op til 3 gratis tilbud — uforpligtende." },
];
const routeMeta = [
  ...STATIC_META,
  ...BLOG_CATEGORIES.map((c) => ({ path: `/blog/kategori/${c.slug}`, title: `${c.name} – artikler og guides | Serviceydere`, description: `Alle artikler om ${c.name.toLowerCase()}: priser, tjeklister og råd fra Serviceydere.` })),
  ...BLOG_POSTS.map((p) => ({ path: `/blog/${p.slug}`, title: `${p.title} | Serviceydere`, description: p.description,
    article: { title: p.title, publishedAt: p.publishedAt, updatedAt: p.updatedAt } })),
  ...ENGINE_META,
  ...GUIDES.map((g) => ({ path: g.href, title: `${g.title} | Serviceydere`, description: g.desc })),
  ...SOFTWARE_PAGES.map((s) => ({ path: s.href, title: s.seoTitle ?? `${s.label} | Serviceydere`, description: s.seoDescription ?? s.blurb })),
  ...cityMeta("rengoering", "Rengøring", CITIES),
  ...cityMeta("flyttehjaelp", "Flyttehjælp", MOVING_CITIES),
  ...cityMeta("haandvaerker", "Håndværker", HANDYMAN_CITIES),
  ...cityMeta("haveservice", "Haveservice", GARDEN_CITIES),
  ...BRANCHES.flatMap((b) => branchCities(b).map((c) => ({ path: `/${b.kind}/${c.slug}`, title: `${b.label} ${c.name}: Priser 2026 · Få 3 tilbud | Serviceydere`, description: `${b.label} i ${c.name}: ${c.unitLow.toLocaleString("da-DK")}–${c.unitHigh.toLocaleString("da-DK")} ${b.unit}. Se lokale priser og få 3 gratis tilbud fra ${b.plural} i ${c.name}.` }))),
  { path: "/by", title: "Find serviceydere i din by – alle byer | Serviceydere", description: "Se priser og få 3 gratis tilbud på rengøring, håndværk, maler, elektriker, VVS og meget mere i 34 danske byer." },
  ...CITY_FACTS.map((c) => ({ path: `/by/${c.slug}`, title: `Serviceydere i ${c.name} – priser på ${servicesForCity(c.slug).length} services | Serviceydere`, description: `Find rengøring, håndværkere, maler, elektriker, VVS og flere services i ${c.name}. Se lokale priser og få 3 gratis tilbud.` })),
];
// Virksomhedssider (/v/:slug) — hentes ved build, så hver virksomhed får egen
// statisk title/description/canonical og egen sitemap. Fejl må ikke stoppe build.
const SB_URL = "https://gkectsellkpltrxvusot.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZWN0c2VsbGtwbHRyeHZ1c290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTkxMDYsImV4cCI6MjA5MTU5NTEwNn0.VxLbs00qkZXCiNa468aHEC9FJhoY3Gyik0D8dKBdq_c";
try {
  const res = await fetch(`${SB_URL}/rest/v1/businesses?select=slug,name,city,category,description,updated_at&is_active=eq.true&limit=5000`, {
    headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
    signal: AbortSignal.timeout(15000),
  });
  if (res.ok) {
    const rows: { slug: string; name: string; city?: string | null; category?: string | null; description?: string | null; updated_at?: string | null }[] = await res.json();
    const valid = rows.filter((b) => b.slug && /^[a-z0-9-]+$/i.test(b.slug) && b.name);
    for (const b of valid) {
      const where = b.city ? ` i ${b.city}` : "";
      const cat = b.category ? ` – ${b.category}` : "";
      const desc = (b.description || "").replace(/\s+/g, " ").trim();
      routeMeta.push({
        path: `/v/${b.slug}`,
        title: `${b.name}${where}${cat} | Book online`.slice(0, 70),
        description: (desc || `Book ${b.name}${where} online. Se priser, anmeldelser og åbningstider på Serviceydere.`).slice(0, 158),
      });
    }
    const businessSitemapPath = resolve("public/sitemap-businesses.xml");
    if (valid.length > 0) {
      writeFileSync(businessSitemapPath, buildUrlset(toUrls(valid.map((b) => ({
        path: `/v/${b.slug}`, changefreq: "weekly", priority: "0.8",
        ...(b.updated_at ? { lastmod: b.updated_at.slice(0, 10) } : {}),
      })))));
    } else if (existsSync(businessSitemapPath)) {
      unlinkSync(businessSitemapPath);
    }
    console.log(`business seo pages: ${valid.length}`);
  }
} catch (e) {
  console.warn("business seo fetch skipped:", (e as Error).message);
}
writeSitemapIndex();
writeFileSync(resolve("scripts/.seo-routes.json"), JSON.stringify(routeMeta));
console.log(`seo route meta written (${routeMeta.length})`);
