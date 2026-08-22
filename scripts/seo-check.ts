/**
 * Automatisk SEO- og sitemap-validering.
 *
 * Kører i CI efter build/deploy og fejler hvis noget af det, der styrer vores
 * synlighed i Google, er gået i stykker:
 *
 *  - index.html: title, meta description, canonical, OG/Twitter, JSON-LD
 *  - robots.txt: må ikke blokere hele sitet, skal pege på sitemap-index
 *  - sitemap-index.xml: skal findes og pege på child-sitemaps der eksisterer
 *  - alle sitemaps: gyldig XML, absolutte https-URL'er, ingen dubletter
 *
 * Brug:
 *   bun run scripts/seo-check.ts                 # validerer filer i repoet
 *   bun run scripts/seo-check.ts --live          # validerer også live-domænet
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PUBLIC = join(ROOT, "public");
const SITE = "https://serviceydere.dk";
const LIVE = process.argv.includes("--live");

const errors: string[] = [];
const warnings: string[] = [];
const fail = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);

const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : null);

/* ---------------------------------------------------------------- index.html */
const html = read(join(ROOT, "index.html"));
if (!html) {
  fail("index.html mangler");
} else {
  const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
  if (!title) fail("index.html: <title> mangler");
  else if (/lovable/i.test(title)) fail(`index.html: <title> er stadig en skabelon-værdi ("${title}")`);
  else if (title.length > 65) warn(`index.html: <title> er ${title.length} tegn (anbefalet under 60)`);

  const desc = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]?.trim();
  if (!desc) fail("index.html: meta description mangler");
  else if (/lovable generated/i.test(desc)) fail("index.html: meta description er stadig skabelon-tekst");
  else if (desc.length > 165) warn(`index.html: meta description er ${desc.length} tegn (anbefalet under 160)`);
  else if (desc.length < 70) warn(`index.html: meta description er kun ${desc.length} tegn`);

  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i)?.[1];
  if (!canonical) fail("index.html: canonical mangler");
  else if (!canonical.startsWith("/") && !canonical.startsWith(SITE))
    fail(`index.html: canonical peger væk fra ${SITE} (${canonical})`);

  const required = [
    'property="og:title"', 'property="og:description"', 'property="og:image"',
    'property="og:url"', 'property="og:type"', 'property="og:site_name"',
    'name="twitter:card"', 'name="twitter:title"', 'name="twitter:description"',
    'name="twitter:image"',
  ];
  required.forEach((attr) => {
    if (!html.includes(attr)) fail(`index.html: mangler <meta ${attr}>`);
  });

  const ldBlocks = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)];
  if (!ldBlocks.length) fail("index.html: ingen JSON-LD strukturerede data");
  const types = new Set<string>();
  ldBlocks.forEach((m, i) => {
    try {
      const data = JSON.parse(m[1]);
      const t = data["@type"];
      (Array.isArray(t) ? t : [t]).forEach((x: string) => types.add(x));
    } catch {
      fail(`index.html: JSON-LD blok #${i + 1} er ugyldig JSON`);
    }
  });
  ["Organization", "WebSite"].forEach((t) => {
    if (!types.has(t)) fail(`index.html: JSON-LD mangler @type ${t}`);
  });
}

/* ---------------------------------------------------------------- robots.txt */
const robots = read(join(PUBLIC, "robots.txt"));
if (!robots) {
  fail("public/robots.txt mangler");
} else {
  if (/^\s*Disallow:\s*\/\s*$/im.test(robots) && /User-agent:\s*\*/i.test(robots))
    fail("robots.txt blokerer hele sitet (Disallow: /)");
  if (!/Sitemap:\s*https?:\/\/\S*sitemap-index\.xml/i.test(robots))
    fail("robots.txt: Sitemap-linjen peger ikke på sitemap-index.xml");
}

/* ------------------------------------------------------------------ sitemaps */
const indexPath = join(PUBLIC, "sitemap-index.xml");
const indexXml = read(indexPath);
if (!indexXml) {
  fail("public/sitemap-index.xml mangler");
} else {
  const children = [...indexXml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  if (!children.length) fail("sitemap-index.xml indeholder ingen <loc>-elementer");
  children.forEach((loc) => {
    if (!loc.startsWith("https://")) fail(`sitemap-index: ikke-absolut URL ${loc}`);
    const file = loc.split("/").pop()!;
    if (!existsSync(join(PUBLIC, file))) fail(`sitemap-index peger på ${file}, som ikke findes i public/`);
  });
}

const seen = new Map<string, string>();
readdirSync(PUBLIC)
  .filter((f) => f.startsWith("sitemap") && f.endsWith(".xml") && f !== "sitemap-index.xml")
  .forEach((file) => {
    const xml = read(join(PUBLIC, file))!;
    if (!/<urlset[\s>]/.test(xml) && !/<sitemapindex[\s>]/.test(xml))
      fail(`${file}: mangler <urlset>/<sitemapindex> rod-element`);
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
    if (!locs.length) fail(`${file}: ingen URL'er`);
    locs.forEach((loc) => {
      if (!loc.startsWith("https://")) fail(`${file}: ikke-absolut URL ${loc}`);
      if (loc.includes("localhost") || loc.includes("lovable.app"))
        fail(`${file}: URL peger ikke på produktionsdomænet (${loc})`);
      const prev = seen.get(loc);
      if (prev && prev !== file) warn(`Dublet-URL i både ${prev} og ${file}: ${loc}`);
      seen.set(loc, file);
    });
  });

/* ------------------------------------------------------- live-verifikation */
const checkLive = async () => {
  const urls = [`${SITE}/robots.txt`, `${SITE}/sitemap-index.xml`, `${SITE}/`];
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) fail(`Live: ${url} svarede ${res.status}`);
      else if (url.endsWith("sitemap-index.xml")) {
        const body = await res.text();
        if (!body.includes("<sitemapindex")) fail("Live: sitemap-index.xml er ikke et sitemapindex");
      }
    } catch (e) {
      fail(`Live: kunne ikke hente ${url} (${(e as Error).message})`);
    }
  }
};

const finish = () => {
  warnings.forEach((w) => console.log(`⚠️  ${w}`));
  errors.forEach((e) => console.log(`❌ ${e}`));
  console.log(
    `\nSEO-check: ${errors.length} fejl, ${warnings.length} advarsler, ${seen.size} sitemap-URL'er valideret.`,
  );
  if (errors.length) process.exit(1);
  console.log("✅ Alle SEO- og sitemap-checks bestået.");
};

if (LIVE) checkLive().then(finish);
else finish();
