// Genererer public/sitemap.xml så /sitemap.xml returnerer 200 fra Lovable
// hosting. Den dynamiske edge function (sitemap) bruges stadig som fuld
// sitemap med alle virksomheder — vi henviser til begge fra robots.txt.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { BLOG_POSTS } from "../src/pages/blog/blogPosts";
import { GUIDES } from "../src/pages/guides/guidesRegistry";
import { CITIES } from "../src/pages/cities/cleaningCityData";
import { MOVING_CITIES } from "../src/pages/cities/movingCityData";
import { HANDYMAN_CITIES } from "../src/pages/cities/handymanCityData";
import { GARDEN_CITIES } from "../src/pages/cities/gardenCityData";

const BASE_URL = "https://serviceydere.dk";

// Fælles lastmod — opdateres automatisk ved hver build. Giver Google et
// frisk signal på SEO-sider når vi udruller nyt indhold.
const TODAY = new Date().toISOString().slice(0, 10);

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

const CITY_ENTRIES: SitemapEntry[] = [
  ...CITIES.map((c) => ({ path: `/rengoering/${c.slug}`, changefreq: "weekly" as const, priority: "0.8" })),
  ...MOVING_CITIES.map((c) => ({ path: `/flyttehjaelp/${c.slug}`, changefreq: "weekly" as const, priority: "0.8" })),
  ...HANDYMAN_CITIES.map((c) => ({ path: `/haandvaerker/${c.slug}`, changefreq: "weekly" as const, priority: "0.8" })),
  ...GARDEN_CITIES.map((c) => ({ path: `/haveservice/${c.slug}`, changefreq: "weekly" as const, priority: "0.8" })),
];

const entries: SitemapEntry[] = [
  ...STATIC_ENTRIES,
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

const urls = [
  ...entries.map((e) => ({
    loc: `${BASE_URL}${e.path}`,
    changefreq: e.changefreq,
    priority: e.priority,
    lastmod: e.lastmod ?? TODAY,
  })),
  ...CATEGORIES.map((c) => ({
    loc: `${BASE_URL}/virksomheder?category=${encodeURIComponent(c)}`,
    changefreq: "weekly" as const,
    priority: "0.7",
    lastmod: TODAY,
  })),
];

const xml = [
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

writeFileSync(resolve("public/sitemap.xml"), xml);
console.log(`sitemap.xml written (${urls.length} entries)`);