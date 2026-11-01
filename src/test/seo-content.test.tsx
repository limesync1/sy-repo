import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { GuideBody, SoftwareBody } from "../seo/contentBodies";
import Guide from "../pages/guides/CarpenterPriceGuide";
import EmployeeApp from "../pages/software/EmployeeAppFeature";
import { LegacyCityBody, legacyCityGroups } from "../seo/LegacyCityBody";
import { relatedContent } from "../seo/related-content";
import { citySeo } from "../seo/city-seo";

describe("Public content sources", () => {
  it.each(legacyCityGroups)("uses registered local facts for $kind", group => {
    const city = group.cities.find(city => city.slug === "koebenhavn");
    if (!city) throw new Error("Missing city");
    const markup = renderToStaticMarkup(<LegacyCityBody kind={group.kind} city={city} />);
    const doc = new DOMParser().parseFromString(markup, "text/html");
    expect(doc.body.textContent).toContain(city.intro);
    expect(doc.querySelectorAll("tbody tr").length).toBeGreaterThan(1);
    expect(doc.querySelector(`a[href="${group.guide}"]`)).not.toBeNull();
    expect(citySeo(group.kind, city).path).toBe(`/${group.kind}/koebenhavn`);
  });

  it("keeps route-planning articles in their own topic cluster", () => {
    const selection = relatedContent("Ruteplanlægning", "/software/ruteplanlaegger");
    expect(selection.posts).toHaveLength(3);
    expect(selection.posts.every(post => post.category === "Ruteplanlægning")).toBe(true);
    expect(selection.guides).toHaveLength(0);
  });

  it("normalizes window-cleaning topic aliases without unrelated filler", () => {
    const selection = relatedContent("Vinduespudser", "/blog/eksempel");
    expect(selection.guides[0].href).toBe("/guides/vinduespudsning");
    expect(selection.guides.every(guide => guide.category === "Vinduespudsning")).toBe(true);
  });

  it("exports the same guide configuration for browser and crawler rendering", () => {
    const config = Guide.seoConfig;
    expect(config.canonicalPath).toBe("/priser/tomrer");
    const markup = renderToStaticMarkup(<StaticRouter location={config.canonicalPath}><GuideBody config={config} /></StaticRouter>);
    const doc = new DOMParser().parseFromString(markup, "text/html");
    expect(doc.querySelectorAll("tbody tr")).toHaveLength(config.priceTable.rows.length);
    for (const row of config.priceTable.rows) expect(doc.body.textContent).toContain(row.price);
    expect(doc.querySelectorAll("h2").length).toBeGreaterThan(2);
  });

  it("keeps employee content sourced from the current public page", () => {
    const config = EmployeeApp.seoConfig;
    expect(config.canonicalPath).toBe("/software/medarbejder-app");
    const markup = renderToStaticMarkup(<StaticRouter location={config.canonicalPath}><SoftwareBody config={config} /></StaticRouter>);
    const doc = new DOMParser().parseFromString(markup, "text/html");
    expect(doc.querySelectorAll("h3")).toHaveLength(config.faq.length);
    expect(doc.querySelector("h1")?.textContent).toBe(config.heroTitle);
  });
});