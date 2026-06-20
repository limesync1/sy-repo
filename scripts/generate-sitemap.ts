// Genererer public/sitemap.xml så /sitemap.xml returnerer 200 fra Lovable
// hosting. Den dynamiske edge function (sitemap) bruges stadig som fuld
// sitemap med alle virksomheder — vi henviser til begge fra robots.txt.

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://serviceydere.dk";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/virksomheder", changefreq: "daily", priority: "0.9" },
  { path: "/tilbud", changefreq: "weekly", priority: "0.9" },
  { path: "/opret-virksomhed", changefreq: "monthly", priority: "0.7" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
  { path: "/privatlivspolitik", changefreq: "yearly", priority: "0.3" },
  { path: "/vilkaar", changefreq: "yearly", priority: "0.3" },
  // Prisguides — SEO landing pages for høj-volume søgninger.
  { path: "/priser/rengoering", changefreq: "monthly", priority: "0.8" },
  { path: "/priser/flyttehjaelp", changefreq: "monthly", priority: "0.8" },
  { path: "/guides/rengoering-af-laminatgulv", changefreq: "monthly", priority: "0.7" },
  { path: "/guides", changefreq: "weekly", priority: "0.8" },
  // By-landingssider for rengøring — målrettet lokale søgninger
  // som "rengøring [by]" og "rengøringsfirma [by]".
  { path: "/rengoering/koebenhavn", changefreq: "weekly", priority: "0.85" },
  { path: "/rengoering/aarhus", changefreq: "weekly", priority: "0.85" },
  { path: "/rengoering/odense", changefreq: "weekly", priority: "0.8" },
  { path: "/rengoering/aalborg", changefreq: "weekly", priority: "0.8" },
  { path: "/rengoering/esbjerg", changefreq: "weekly", priority: "0.8" },
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
  })),
  ...CATEGORIES.map((c) => ({
    loc: `${BASE_URL}/virksomheder?category=${encodeURIComponent(c)}`,
    changefreq: "weekly" as const,
    priority: "0.7",
  })),
];

const xml = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ...urls.map((u) =>
    [
      `  <url>`,
      `    <loc>${escapeXml(u.loc)}</loc>`,
      u.changefreq ? `    <changefreq>${u.changefreq}</changefreq>` : null,
      u.priority ? `    <priority>${u.priority}</priority>` : null,
      `  </url>`,
    ].filter(Boolean).join("\n"),
  ),
  `</urlset>`,
].join("\n");

writeFileSync(resolve("public/sitemap.xml"), xml);
console.log(`sitemap.xml written (${urls.length} entries)`);