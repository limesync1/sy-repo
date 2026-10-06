import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderRouteHead } from "../../scripts/seo-prerender-head";

const template = readFileSync("index.html", "utf8");

describe("Static public SEO heads", () => {
  it.each(["/virksomheder", "/rengoering/odense", "/software", "/blog/kategori/rengoering", "/v/firma"])("renders complete metadata for %s without JavaScript", (path) => {
    const html = renderRouteHead(template, { path, title: 'Priser & tilbud "lokalt"', description: "Find lokale virksomheder" });
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.title).toBe('Priser & tilbud "lokalt"');
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(`https://serviceydere.dk${path}`);
    expect(doc.querySelector('meta[property="og:url"]')?.getAttribute("content")).toBe(`https://serviceydere.dk${path}`);
    expect(doc.querySelector('meta[property="og:type"]')?.getAttribute("content")).toBe("website");
    expect(doc.querySelectorAll('link[hreflang]')).toHaveLength(2);
    const data = JSON.parse(doc.querySelector('[data-seo-page="1"]')?.textContent ?? "{}");
    expect(data.url).toBe(`https://serviceydere.dk${path}`);
    expect(data.inLanguage).toBe("da-DK");
  });

  it("marks individual blog posts as articles and safely serializes page data", () => {
    const html = renderRouteHead(template, { path: "/blog/artikel", title: "En artikel", description: "</script><b>Tekst</b>" });
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelector('meta[property="og:type"]')?.getAttribute("content")).toBe("article");
    expect(JSON.parse(doc.querySelector('[data-seo-page="1"]')?.textContent ?? "{}").description).toBe("</script><b>Tekst</b>");
  });
});