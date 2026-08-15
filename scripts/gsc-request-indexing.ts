// Google Search Console: re-submit sitemap + URL-inspect en liste af
// opdaterede artikler efter en enrichment-batch.
//
// Bemærk: Indexing API kun officielt for JobPosting/BroadcastEvent.
// For almindelige sider er den bedste agent-drevne strategi:
//   1) Genindsend sitemap (trigger ny crawl-prioritering)
//   2) Kald URL-inspection for hver URL (signal til GSC + verificér state)
//   3) Parallel IndexNow-ping (Bing/Yandex som hurtigere fallback)
//
// Kræver miljø-variabler:
//   LOVABLE_API_KEY                — sat automatisk
//   GOOGLE_SEARCH_CONSOLE_API_KEY  — fra GSC-connector
//
// Brug:
//   bunx tsx scripts/gsc-request-indexing.ts --batch=enrichment-3
//   bunx tsx scripts/gsc-request-indexing.ts <slug1> <slug2>

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const SITE = "https://serviceydere.dk/";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

const LOVABLE_KEY = process.env.LOVABLE_API_KEY;
const GSC_KEY = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;

if (!LOVABLE_KEY || !GSC_KEY) {
  console.error("✗ Mangler LOVABLE_API_KEY eller GOOGLE_SEARCH_CONSOLE_API_KEY");
  console.error("  Forbind Google Search Console-connector via Settings → Connectors.");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${LOVABLE_KEY}`,
  "X-Connection-Api-Key": GSC_KEY,
  "Content-Type": "application/json",
};

const args = process.argv.slice(2);
const batchArg = args.find((a) => a.startsWith("--batch="));
let slugs: string[] = [];
if (batchArg) {
  const file = resolve(`reports/indexnow/${batchArg.slice("--batch=".length)}.txt`);
  if (!existsSync(file)) {
    console.error(`✗ batch-fil findes ikke: ${file}`);
    process.exit(1);
  }
  slugs = readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
} else {
  slugs = args.filter((a) => !a.startsWith("--"));
}

if (slugs.length === 0) {
  console.error("✗ ingen slugs angivet");
  process.exit(1);
}

(async () => {
  // 1) Genindsend hovedsitemap + blog-sitemap
  for (const sitemap of ["sitemap-index.xml", "sitemap-pages.xml", "sitemap-blog.xml"]) {
    const enc = encodeURIComponent(`${SITE}${sitemap}`);
    const url = `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(SITE)}/sitemaps/${enc}`;
    const res = await fetch(url, { method: "PUT", headers });
    console.log(`PUT sitemap ${sitemap} → ${res.status}`);
  }

  // 2) URL-inspection pr. opdateret artikel
  for (const slug of slugs) {
    const inspectionUrl = `${SITE.replace(/\/$/, "")}/blog/${slug.replace(/^\/blog\//, "")}`;
    const res = await fetch(`${GATEWAY}/v1/urlInspection/index:inspect`, {
      method: "POST",
      headers,
      body: JSON.stringify({ inspectionUrl, siteUrl: SITE }),
    });
    if (!res.ok) {
      console.error(`✗ ${slug}: ${res.status}`);
      continue;
    }
    const data = (await res.json()) as {
      inspectionResult?: { indexStatusResult?: { verdict?: string; coverageState?: string } };
    };
    const r = data.inspectionResult?.indexStatusResult;
    console.log(`  ${slug.padEnd(50)} verdict=${r?.verdict ?? "?"} coverage=${r?.coverageState ?? "?"}`);
  }

  console.log(`✓ ${slugs.length} URLs inspiceret · 2 sitemaps re-submittet`);
})();