import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { indexableLocalAndIndustryPaths, missingIndexableContent } from "../seo/indexable-routes";
import { renderStaticBodies } from "../seo/staticBodies";

describe("Registered industry and city indexing prerequisites", () => {
  it("includes every registered route in the sitemap and metadata with full public content", async () => {
    const routes = JSON.parse(readFileSync("scripts/.seo-routes.json", "utf8"));
    const sitemap = readFileSync("public/sitemap-pages.xml", "utf8") + readFileSync("public/sitemap-cities.xml", "utf8");
    const bodies = await renderStaticBodies();
    const paths = indexableLocalAndIndustryPaths();
    expect(paths).toContain("/software/branche/privatrengoering");
    expect(paths).toContain("/rengoering/koebenhavn");
    expect(paths).toContain("/by/koebenhavn");
    expect(missingIndexableContent(routes, bodies)).toEqual([]);
    for (const path of paths) expect(sitemap).toContain(`<loc>https://serviceydere.dk${path}</loc>`);
  }, 60000);

  it("rejects absent metadata and empty content instead of silently accepting a generic fallback", () => {
    const paths = indexableLocalAndIndustryPaths();
    const routes = paths.map(path => ({ path, title: "Registered title", description: "Registered description" }));
    const bodies = Object.fromEntries(paths.map(path => [path, "Full content"]));
    expect(missingIndexableContent(routes, bodies)).toEqual([]);
    delete bodies["/rengoering/koebenhavn"];
    expect(missingIndexableContent(routes, bodies)).toEqual(["/rengoering/koebenhavn"]);
    expect(missingIndexableContent(routes.filter(route => route.path !== "/by/koebenhavn"), {
      ...bodies, "/rengoering/koebenhavn": "Full content",
    })).toEqual(["/by/koebenhavn"]);
  });
});