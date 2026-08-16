// Bygger PDF-brugerguiden ud fra funktionskataloget (src/data/routePlannerFeatures.ts).
// Kaldes automatisk: predev/prebuild i package.json og af Vite-pluginnet når
// datafilen ændres i dev. Skriver også en hash, så en test kan fange en PDF,
// der er kommet bagud i forhold til UI'et.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PDF_PATH = path.join(root, "public/guides/serviceydere-ruteplanlaegger-brugerguide.pdf");
export const HASH_PATH = path.join(root, "public/guides/planner-guide.hash");
const JSON_PATH = path.join(root, "node_modules/.cache/planner-features.json");

const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });

export function buildPlannerGuide({ silent = false } = {}) {
  const log = (m) => { if (!silent) console.log(m); };
  let json;
  try {
    json = run("bun", ["scripts/planner-guide-data.ts"]);
  } catch {
    log("[planner-guide] kunne ikke læse funktionskataloget — springer over");
    return false;
  }
  const hash = createHash("sha256").update(json).digest("hex");
  mkdirSync(path.dirname(JSON_PATH), { recursive: true });
  writeFileSync(JSON_PATH, json);
  mkdirSync(path.dirname(PDF_PATH), { recursive: true });
  try {
    run("python3", ["scripts/generate-planner-guide.py", JSON_PATH, PDF_PATH]);
  } catch (e) {
    log("[planner-guide] python3/reportlab ikke tilgængelig — PDF ikke genereret");
    return false;
  }
  writeFileSync(HASH_PATH, hash + "\n");
  log("[planner-guide] PDF opdateret");
  return true;
}

export const catalogHash = (json) => createHash("sha256").update(json).digest("hex");

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const ok = buildPlannerGuide();
  if (!ok && !existsSync(PDF_PATH)) process.exitCode = 0; // aldrig blokér build
}
