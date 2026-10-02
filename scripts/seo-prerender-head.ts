import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, join } from "path";

const BASE_URL = "https://serviceydere.dk";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Build-only plugin: writes dist/<route>/index.html with route-specific head tags. */
export const seoPrerenderHead = () => ({
  name: "seo-prerender-head",
  apply: "build" as const,
  closeBundle() {
    const metaFile = resolve("scripts/.seo-routes.json");
    const indexFile = resolve("dist/index.html");
    if (!existsSync(metaFile) || !existsSync(indexFile)) return;
    const html = readFileSync(indexFile, "utf8");
    const routes: { path: string; title: string; description: string }[] = JSON.parse(readFileSync(metaFile, "utf8"));
    for (const r of routes) {
      if (!r.path.startsWith("/") || r.path === "/" || r.path.includes("..")) continue;
      const url = `${BASE_URL}${r.path}`;
      const t = esc(r.title), d = esc(r.description);
      const out = html
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
        .replace(/(<meta name="description" content=")[^"]*(")/, `$1${d}$2`)
        .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${t}$2`)
        .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${t}$2`)
        .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${d}$2`)
        .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${d}$2`)
        .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
        .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
        .replace(/(<meta property="og:type" content=")[^"]*(")/, `$1${r.path.startsWith("/blog/") ? "article" : "website"}$2`);
      const dir = join(resolve("dist"), r.path);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "index.html"), out);
    }
    console.log(`seo-prerender-head: ${routes.length} routes`);
  },
});
