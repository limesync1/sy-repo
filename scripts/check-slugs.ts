// Verificér at hver slug i blogPosts.ts har en faktisk fil i posts/.
// Forhindrer at vi spilder en enrichment-batch på et slug der ikke
// findes som komponent. Returnerer non-zero exit-code hvis noget
// mangler — så CI / batch-scripts kan stoppe før de skriver.
//
// Kør: bunx tsx scripts/check-slugs.ts

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const blogSrc = readFileSync(resolve("src/pages/blog/blogPosts.ts"), "utf8");

// Match alle import("./posts/<File>") for at finde forventede filer.
const expected = new Set<string>();
for (const m of blogSrc.matchAll(/import\(["']\.\/posts\/([^"']+)["']\)/g)) {
  expected.add(`src/pages/blog/posts/${m[1]}.tsx`);
}

const missing: string[] = [];
for (const path of expected) {
  if (!existsSync(resolve(path))) missing.push(path);
}

console.log(`✓ checked ${expected.size} slugs`);
if (missing.length) {
  console.error(`✗ ${missing.length} missing files:`);
  for (const m of missing) console.error("  -", m);
  process.exit(1);
}
console.log("✓ all slugs have a post file");