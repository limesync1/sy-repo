// Genererer public/sitemap.xml så /sitemap.xml returnerer 200 fra Lovable
// hosting. Den dynamiske edge function (sitemap) bruges stadig som fuld
// sitemap med alle virksomheder — vi henviser til begge fra robots.txt.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { BLOG_POSTS } from "../src/pages/blog/blogPosts";
import { BLOG_CATEGORIES } from "../src/pages/blog/blogCategories";
import { GUIDES } from "../src/pages/guides/guidesRegistry";
import { CITIES } from "../src/pages/cities/cleaningCityData";
import { MOVING_CITIES } from "../src/pages/cities/movingCityData";
import { HANDYMAN_CITIES } from "../src/pages/cities/handymanCityData";
import { GARDEN_CITIES } from "../src/pages/cities/gardenCityData";
import { SOFTWARE_PAGES } from "../src/pages/software/softwareRegistry";

const BASE_URL = "https://serviceydere.dk";

// Bruges kun til <lastmod> på selve sitemap-index'et (hvornår sitemappet
// blev genereret). Sider får kun lastmod, når vi har en reel, sidespecifik
// dato — et build-tidsstempel er ikke et sandt "sidst ændret"-signal.
const GENERATED_AT = new Date().toISOString().slice(0, 10);

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
  { path: "/opret-virksomhed", changefreq: "monthly", priority: "0.7" },
  { path: "/hjaelp", changefreq: "monthly", priority: "0.5" },
  { path: "/guides", changefreq: "weekly", priority: "0.8" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
  { path: "/privatlivspolitik", changefreq: "yearly", priority: "0.3" },
  { path: "/vilkaar", changefreq: "yearly", priority: "0.3" },
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

const buildUrlset = (urls: ReturnType<typeof toUrls>) =>
  [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls.map((u) =>
      [
        `  <url>`,
        `    <loc>${escapeXml(u.loc)}</loc>`,
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
const blogUrls = toUrls([...BLOG_ENTRIES, ...BLOG_CATEGORY_ENTRIES]);
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

const indexXml = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ...["sitemap-pages.xml", "sitemap-blog.xml", "sitemap-guides.xml", "sitemap-cities.xml"].map(
    (name) =>
      `  <sitemap><loc>${BASE_URL}/${name}</loc><lastmod>${GENERATED_AT}</lastmod></sitemap>`,
  ),
  `</sitemapindex>`,
].join("\n");
writeFileSync(resolve("public/sitemap-index.xml"), indexXml);

console.log(
  `sitemaps written — pages:${pagesUrls.length} blog:${blogUrls.length} guides:${guidesUrls.length} cities:${citiesUrls.length} (legacy sitemap.xml:${allUrls.length})`,
);