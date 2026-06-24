// Kvalitets- og link-styrke rapport pr. blog-artikel.
//
// For hver fil i src/pages/blog/posts/*.tsx beregnes:
//   - lines: total linjer (proxy for indhold)
//   - sections: antal section-blokke
//   - faqs: antal FAQ-spørgsmål
//   - outLinks: antal interne <Link to="..."> (udgående)
//   - inLinks: antal andre artikler der linker hertil (indgående)
//   - score: 0–100 sammensat kvalitetsscore
//
// Bruges efter hver enrichment-batch til at se hvilke artikler der
// stadig er for tynde, og hvilke der har lav intern link-styrke.
//
// Kør: bunx tsx scripts/blog-quality-report.ts [--batch=<navn>]

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, resolve, basename } from "path";

const POSTS_DIR = resolve("src/pages/blog/posts");
const BLOG_META = readFileSync(resolve("src/pages/blog/blogPosts.ts"), "utf8");

const slugByFile = new Map<string, string>();
const blockRe = /import\(["']\.\/posts\/([^"']+)["']\)/g;
const slugRe = /slug:\s*"([^"]+)"/g;
// Naivt: kobl slug → fil i deklarations-rækkefølge via et sekventielt scan.
{
  const lines = BLOG_META.split("\n");
  let lastSlug = "";
  for (const line of lines) {
    const s = /slug:\s*"([^"]+)"/.exec(line);
    if (s) lastSlug = s[1];
    const f = /import\(["']\.\/posts\/([^"']+)["']\)/.exec(line);
    if (f && lastSlug) slugByFile.set(`${f[1]}.tsx`, lastSlug);
  }
}

interface Row {
  file: string;
  slug: string;
  lines: number;
  sections: number;
  faqs: number;
  outLinks: number;
  inLinks: number;
  score: number;
}

const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith(".tsx"));
const inLinkCount = new Map<string, number>();
const fileSources = new Map<string, string>();

for (const f of files) {
  fileSources.set(f, readFileSync(join(POSTS_DIR, f), "utf8"));
}

// Tæl indgående links: scan alle filer for /blog/<slug>
for (const src of fileSources.values()) {
  for (const m of src.matchAll(/\/blog\/([a-z0-9-]+)/g)) {
    inLinkCount.set(m[1], (inLinkCount.get(m[1]) ?? 0) + 1);
  }
}

function scoreRow(r: Omit<Row, "score">): number {
  // Vægtning: indhold 50, struktur 30, links 20.
  const content = Math.min(50, (r.lines / 250) * 50);
  const structure = Math.min(30, (r.sections * 5 + r.faqs * 2));
  const links = Math.min(20, r.outLinks * 3 + r.inLinks * 2);
  return Math.round(content + structure + links);
}

const rows: Row[] = [];
for (const f of files) {
  const src = fileSources.get(f)!;
  const slug = slugByFile.get(f) ?? "(ukendt)";
  const lines = src.split("\n").length;
  // sections: hvert heading: "..." eller paragraphs/list som section-grænse
  const sections = (src.match(/\{\s*(heading|paragraphs|list|ordered|body):/g) ?? []).length;
  const faqs = (src.match(/\{\s*q:\s*"/g) ?? []).length;
  const outLinks = (src.match(/<Link\s+to=/g) ?? []).length;
  const inLinks = (inLinkCount.get(slug) ?? 1) - 1; // minus selv-reference
  const base = { file: f, slug, lines, sections, faqs, outLinks, inLinks };
  rows.push({ ...base, score: scoreRow(base) });
}

rows.sort((a, b) => a.score - b.score);

const arg = process.argv.find((a) => a.startsWith("--batch="));
const batchName = arg ? arg.slice("--batch=".length) : new Date().toISOString().slice(0, 10);

const outDir = resolve("reports/blog-quality");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const csvPath = join(outDir, `${batchName}.csv`);
const mdPath = join(outDir, `${batchName}.md`);

const csv = [
  "score,file,slug,lines,sections,faqs,outLinks,inLinks",
  ...rows.map((r) => [r.score, r.file, r.slug, r.lines, r.sections, r.faqs, r.outLinks, r.inLinks].join(",")),
].join("\n");
writeFileSync(csvPath, csv);

const avg = Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length);
const thin = rows.filter((r) => r.score < 40);
const lowLinks = rows.filter((r) => r.inLinks < 2);

const md = [
  `# Blog-kvalitet — ${batchName}`,
  ``,
  `**Artikler:** ${rows.length} | **Gennemsnitsscore:** ${avg}/100`,
  `**For tynde (<40):** ${thin.length} | **Lav indgående link-styrke (<2):** ${lowLinks.length}`,
  ``,
  `## Top 30 tyndeste artikler`,
  ``,
  `| Score | Linjer | Sektioner | FAQ | UdLinks | IndLinks | Slug |`,
  `|------:|-------:|----------:|----:|--------:|---------:|------|`,
  ...rows.slice(0, 30).map((r) =>
    `| ${r.score} | ${r.lines} | ${r.sections} | ${r.faqs} | ${r.outLinks} | ${r.inLinks} | \`${r.slug}\` |`
  ),
  ``,
  `## Orphans (indgående links < 2)`,
  ``,
  ...lowLinks.slice(0, 50).map((r) => `- \`${r.slug}\` — ${r.inLinks} indgående`),
  ``,
].join("\n");
writeFileSync(mdPath, md);

console.log(`✓ ${rows.length} artikler analyseret · gns. score ${avg}/100`);
console.log(`  CSV: ${csvPath}`);
console.log(`  MD : ${mdPath}`);
console.log(`  Tynde: ${thin.length} · Lav link-styrke: ${lowLinks.length}`);