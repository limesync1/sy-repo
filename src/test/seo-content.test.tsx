import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { GuideBody, SoftwareBody } from "../seo/contentBodies";
import Guide from "../pages/guides/CarpenterPriceGuide";
import EmployeeApp from "../pages/software/EmployeeAppFeature";

describe("Public content sources", () => {
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