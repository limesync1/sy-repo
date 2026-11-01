import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderRouteHead, renderHomeHead, routeStructuredData } from "../../scripts/seo-prerender-head";
import { BLOG_POSTS } from "../pages/blog/blogPosts";
import { heroPhotos } from "../components/landing/hero-photos";

const template = readFileSync("index.html", "utf8");

describe("Static public SEO heads", () => {
  it("preloads only the first hero photo and excludes it from other pages", () => {
    const home = renderHomeHead(renderHomeHead(template));
    const doc = new DOMParser().parseFromString(home, "text/html");
    const preload = doc.querySelectorAll('[data-home-photo-preload="1"]');
    expect(preload).toHaveLength(1);
    expect(preload[0].getAttribute("href")).toBe(heroPhotos[0].src);
    const other = renderRouteHead(home, { path: "/tilbud", title: "Tilbud", description: "Tilbud" });
    expect(new DOMParser().parseFromString(other, "text/html").querySelector('[data-home-photo-preload="1"]')).toBeNull();
  });
  it("exposes five stable image URLs without JS and keeps them off other pages", () => {
    const home = renderHomeHead(template);
    const doc = new DOMParser().parseFromString(home, "text/html");
    const data = JSON.parse(doc.querySelector('[data-seo-home="1"]')?.textContent ?? "{}");
    expect(data.image).toHaveLength(5);
    expect(new Set(data.image.map((image: { contentUrl: string }) => image.contentUrl)).size).toBe(5);
    expect(data.image.every((image: { contentUrl: string }) => image.contentUrl.startsWith("https://serviceydere.dk/__l5e/assets-v1/"))).toBe(true);
    const other = renderRouteHead(home, { path: "/software", title: "Systemet", description: "Driftssystem" });
    expect(other).not.toContain('data-seo-home="1"');
  });
  it.each(["/virksomheder", "/rengoering/odense", "/software", "/blog/kategori/rengoering", "/v/firma"])("renders complete metadata for %s without JavaScript", (path) => {
    const html = renderRouteHead(template, { path, title: 'Priser & tilbud "lokalt"', description: "Find lokale virksomheder" });
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.title).toBe('Priser & tilbud "lokalt"');
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(`https://serviceydere.dk${path}`);
    expect(doc.querySelector('meta[property="og:url"]')?.getAttribute("content")).toBe(`https://serviceydere.dk${path}`);
    expect(doc.querySelector('meta[property="og:type"]')?.getAttribute("content")).toBe("website");
    expect(doc.querySelectorAll('link[hreflang]')).toHaveLength(2);
    const data = JSON.parse(doc.querySelector('[data-seo-page="1"]')?.textContent ?? "{}");
    expect(data[0].url).toBe(`https://serviceydere.dk${path}`);
    expect(data[0].inLanguage).toBe("da-DK");
    expect(data[1]["@type"]).toBe("BreadcrumbList");
  });

  it("marks individual blog posts as articles and safely serializes page data", () => {
    const html = renderRouteHead(template, { path: "/blog/artikel", title: "En artikel", description: "</script><b>Tekst</b>" });
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelector('meta[property="og:type"]')?.getAttribute("content")).toBe("article");
    expect(JSON.parse(doc.querySelector('[data-seo-page="1"]')?.textContent ?? "{}")[0].description).toBe("</script><b>Tekst</b>");
  });

  it("uses authoritative article dates and self-referencing breadcrumbs", () => {
    const post = BLOG_POSTS.find(post => post.slug === "fjern-svedpletter-fra-hvidt-toej");
    if (!post) throw new Error("Missing registered article");
    const data = routeStructuredData({ path: `/blog/${post.slug}`, title: post.title, description: post.description,
      article: { title: post.title, publishedAt: post.publishedAt, updatedAt: post.updatedAt } });
    expect(data[0]["@type"]).toBe("Article");
    expect(data[0]).toMatchObject({ datePublished: post.publishedAt, dateModified: post.updatedAt ?? post.publishedAt });
    expect(data[1]).toMatchObject({ itemListElement: [
      { position: 1, item: "https://serviceydere.dk/" },
      { position: 2, item: "https://serviceydere.dk/blog" },
      { position: 3, item: `https://serviceydere.dk/blog/${post.slug}` },
    ] });
  });
});