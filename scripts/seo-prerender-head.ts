import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, join } from "path";
import { HOME_TITLE, HOME_DESCRIPTION, homePageData } from "../src/components/landing/home-seo";
import { heroPhotos, HERO_PHOTO_SIZES, photoSrcSet } from "../src/components/landing/hero-photos";

const BASE_URL = "https://serviceydere.dk";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type RouteMeta = { path: string; title: string; description: string; article?: { title: string; publishedAt: string; updatedAt?: string }; parent?: [string, string] };

export const routeStructuredData = (r: RouteMeta) => {
  const url = `${BASE_URL}${r.path}`;
  const post = r.article;
  const parent = r.parent ?? (post || r.path.startsWith("/blog/") ? ["/blog", "Blog"]
    : r.path.startsWith("/priser/") || r.path.startsWith("/guides/") ? ["/guides", "Guides og priser"]
    : r.path.startsWith("/software/") ? ["/software", "Software"]
    : r.path.startsWith("/by/") ? ["/by", "Alle byer"] : undefined);
  return [
    {
      "@context": "https://schema.org",
      "@type": post ? "Article" : "WebPage",
      "@id": `${url}#webpage`, url, name: r.title, description: r.description,
      inLanguage: "da-DK",
      isPartOf: { "@id": `${BASE_URL}/#website` },
      ...(post ? {
        headline: post.title,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt ?? post.publishedAt,
        author: { "@type": "Organization", name: "Serviceydere" },
        publisher: { "@id": `${BASE_URL}/#organization` },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
      } : {}),
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [["/", "Forside"], ...(parent ? [parent] : []), [r.path, post?.title ?? r.title.replace(/\s*\|\s*Serviceydere$/, "")]]
        .map(([path, name], index) => ({ "@type": "ListItem", position: index + 1, name, item: `${BASE_URL}${path}` })),
    },
  ];
};

export const renderRouteHead = (html: string, r: RouteMeta, body?: string) => {
  const url = `${BASE_URL}${r.path}`;
  const t = esc(r.title), d = esc(r.description);
  const isArticle = r.path.startsWith("/blog/") && !r.path.startsWith("/blog/kategori/");
  const pageData = JSON.stringify(routeStructuredData(r)).replace(/</g, "\\u003c");
  return html
    .replace(/<script\b[^>]*data-seo-home="1"[^>]*>[\s\S]*?<\/script>/g, "")
    .replace(/<script\b[^>]*data-seo-page="1"[^>]*>[\s\S]*?<\/script>/g, "")
    .replace(/<link\b[^>]*data-home-photo-preload="1"[^>]*>/g, "")
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:type" content=")[^"]*(")/, `$1${isArticle ? "article" : "website"}$2`)
    .replace(/<link\b[^>]*\bhreflang="[^"]*"[^>]*>/gi, "")
    .replace(/<\/head>/, `<link rel="alternate" hreflang="da-DK" href="${url}" data-seo-hreflang="1" />\n<link rel="alternate" hreflang="x-default" href="${url}" data-seo-hreflang="1" />\n<script type="application/ld+json" data-seo-page="1">${pageData}</script>\n</head>`)
    // Erstat forsidens SEO-fallback i body med sidens egen titel/beskrivelse,
    // så crawlere uden fuld JS-rendering ikke ser forsideindhold på undersider.
    // Fallback-blokken indeholder ingen indlejrede <div>, så match til første
    // </div> er sikkert.
    .replace(
      /<div style="position:absolute;left:-10000px[^>]*>[\s\S]*?<\/div>/,
      // Med body: læsbart indhold i normal flow (React erstatter det ved mount).
      body
        ? `<div data-seo-body="1">${body}</div>`
        : `<div style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;" aria-hidden="false"><h1>${t}</h1><p>${d}</p></div>`,
    )
    // Body-noscript (ikke font-noscript i head) får sidens egen H1.
    .replace(/(<noscript>\s*<div[\s\S]*?<h1>)[\s\S]*?(<\/h1>)/, `$1${t}$2`);
};

const GENERIC_LINKS: [string, string][] = [["/", "Forside"], ["/tilbud", "Få 3 gratis tilbud"], ["/virksomheder", "Find serviceydere"], ["/guides", "Guides og priser"], ["/blog", "Blog"], ["/by", "Alle byer"], ["/software/ruteplanlaegger", "Ruteplanlægger til servicefirmaer"]];
const genericBody = (r: RouteMeta) =>
  `<h1>${esc(r.title.replace(/\s*\|\s*Serviceydere$/, ""))}</h1><p>${esc(r.description)}</p><nav aria-label="Mere fra Serviceydere"><ul>${GENERIC_LINKS.map(([h, l]) => `<li><a href="${h}">${esc(l)}</a></li>`).join("")}</ul></nav>`;

/** Renderer artikler/oversigter til statisk HTML via Vite SSR. Fejl → tom map. */
const loadStaticBodies = async (): Promise<Record<string, string>> => {
  let server: any;
  try {
    const { createServer } = await import("vite");
    server = await createServer({
      configFile: false, logLevel: "error", appType: "custom",
      server: { middlewareMode: true, hmr: false, ws: false },
      resolve: { alias: { "@": resolve("src") } },
    });
    const mod = await server.ssrLoadModule("/src/seo/staticBodies.tsx");
    const bodies = await mod.renderStaticBodies();
    Object.assign(contentMetadata, mod.staticContentMetadata);
    return bodies;
  } catch (e) {
    console.warn("seo-prerender-head: static bodies skipped:", (e as Error).message);
    return {};
  } finally {
    await server?.close();
  }
};

const contentMetadata: Record<string, { title: string; description: string }> = {};

/** Build-only plugin: writes dist/<route>/index.html with route-specific head tags. */
export const seoPrerenderHead = () => ({
  name: "seo-prerender-head",
  transformIndexHtml(html: string) {
    return renderHomeHead(html);
  },
  async closeBundle() {
    const metaFile = resolve("scripts/.seo-routes.json");
    const indexFile = resolve("dist/index.html");
    if (!existsSync(metaFile) || !existsSync(indexFile)) return;
    const html = readFileSync(indexFile, "utf8");
    const routes: RouteMeta[] = JSON.parse(readFileSync(metaFile, "utf8"));
    const bodies = await loadStaticBodies();
    for (const r of routes) {
      if (!r.path.startsWith("/") || r.path === "/" || r.path.includes("..")) continue;
      const meta = { ...r, ...contentMetadata[r.path] };
      const out = renderRouteHead(html, meta, bodies[r.path] ?? genericBody(meta));
      const dir = join(resolve("dist"), r.path);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "index.html"), out);
    }
    console.log(`seo-prerender-head: ${routes.length} routes, ${Object.keys(bodies).length} with full body`);
  },
});

/** Initial HTML exposes all five photos without depending on JavaScript. */
export const renderHomeHead = (html: string) => html
  .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(HOME_TITLE)}</title>`)
  .replace(/(<meta (?:name="(?:description|twitter:description)"|property="og:description") content=")[^"]*(")/g, `$1${esc(HOME_DESCRIPTION)}$2`)
  .replace(/<script\b[^>]*data-seo-home="1"[^>]*>[\s\S]*?<\/script>/g, "")
  .replace(/<link\b[^>]*data-home-photo-preload="1"[^>]*>/g, "")
  .replace(/<\/head>/, `<link rel="preload" as="image" href="${esc(heroPhotos[0].src)}" imagesrcset="${esc(photoSrcSet(heroPhotos[0]))}" imagesizes="${esc(HERO_PHOTO_SIZES)}" fetchpriority="high" data-home-photo-preload="1" />\n<script type="application/ld+json" data-seo-home="1">${JSON.stringify(homePageData()).replace(/</g, "\\u003c")}</script>\n</head>`);
