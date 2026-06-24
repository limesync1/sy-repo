// Orphan-detection: tæller indgående interne links pr. offentlig rute.
// En "orphan" er en side med < 3 indgående links — Google har svært ved
// at opdage og prioritere den. Output er en sorteret liste, så vi kan
// målrette næste runde "Læs også"-blokke og navigation.
//
// Kør: bunx tsx scripts/audit-orphans.ts

import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

const ROOT = resolve("src");
const PUBLIC_ROUTES: string[] = [];

// Indlæs alle kendte offentlige ruter fra registre + sitemap-generator.
const guidesSrc = readFileSync(resolve("src/pages/guides/guidesRegistry.ts"), "utf8");
for (const m of guidesSrc.matchAll(/href:\s*"([^"]+)"/g)) PUBLIC_ROUTES.push(m[1]);

const blogSrc = readFileSync(resolve("src/pages/blog/blogPosts.ts"), "utf8");
for (const m of blogSrc.matchAll(/slug:\s*"([^"]+)"/g)) PUBLIC_ROUTES.push(`/blog/${m[1]}`);

for (const file of [
  "src/pages/cities/cleaningCityData.ts",
  "src/pages/cities/movingCityData.ts",
  "src/pages/cities/handymanCityData.ts",
  "src/pages/cities/gardenCityData.ts",
]) {
  const src = readFileSync(resolve(file), "utf8");
  const base = file.includes("cleaning") ? "/rengoering"
    : file.includes("moving") ? "/flyttehjaelp"
    : file.includes("handyman") ? "/haandvaerker"
    : "/haveservice";
  for (const m of src.matchAll(/slug:\s*"([^"]+)"/g)) PUBLIC_ROUTES.push(`${base}/${m[1]}`);
}

// Statiske ruter vi vil tjekke
PUBLIC_ROUTES.push(
  "/", "/virksomheder", "/tilbud", "/blog", "/guides",
  "/opret-virksomhed", "/hjaelp",
);

const uniqueRoutes = Array.from(new Set(PUBLIC_ROUTES));
const incoming = new Map<string, number>();
uniqueRoutes.forEach((r) => incoming.set(r, 0));

// Walk src/ og tæl `to="..."` + `href="..."` + plain `/path` literals.
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
for (const file of files) {
  const src = readFileSync(file, "utf8");
  for (const route of uniqueRoutes) {
    // Match `"<route>"` med ordgrænse — undgår at /rengoering matcher /rengoering-af-laminatgulv
    const re = new RegExp(`["\`]${route.replace(/[/.-]/g, "\\$&")}["\`?#]`, "g");
    const hits = (src.match(re) || []).length;
    if (hits) incoming.set(route, (incoming.get(route) ?? 0) + hits);
  }
}

const sorted = Array.from(incoming.entries()).sort((a, b) => a[1] - b[1]);

// Tæl dynamisk rendering: hver blog-post linkes fra /blog (BlogIndex),
// hver guide fra /guides, hver by fra sin kategori-landing + tilsvarende
// hub. RelatedContent viser 3 guides + 3 posts på hver artikel.
function dynamicBoost(route: string): number {
  let bonus = 0;
  if (route.startsWith("/blog/")) bonus += 1; // BlogIndex
  if (route.startsWith("/rengoering/") || route.startsWith("/flyttehjaelp/")
    || route.startsWith("/haandvaerker/") || route.startsWith("/haveservice/")) {
    bonus += 2; // kategori-landing + hub
  }
  // Footer linker hubs + populære sider
  if (["/guides/rengoering","/guides/flytning","/guides/haandvaerker",
       "/guides/have","/guides/priser-2026","/blog","/guides","/virksomheder",
       "/tilbud","/opret-virksomhed","/hjaelp","/log-ind"].includes(route)) bonus += 5;
  return bonus;
}

const effective = sorted.map(([r, n]) => [r, n + dynamicBoost(r)] as const)
  .sort((a, b) => a[1] - b[1]);
const orphans = effective.filter(([, n]) => n < 3);

console.log(`\nTotal routes analyzed: ${uniqueRoutes.length}`);
console.log(`Orphans (< 3 incoming internal links): ${orphans.length}\n`);
console.log("ROUTE".padEnd(60), "EFFECTIVE LINKS (static + dynamic)");
console.log("-".repeat(75));
for (const [route, n] of orphans) {
  console.log(route.padEnd(60), n);
}
console.log("\nTop 10 best-linked routes (for reference):");
for (const [route, n] of effective.slice(-10).reverse()) {
  console.log(route.padEnd(60), n);
}