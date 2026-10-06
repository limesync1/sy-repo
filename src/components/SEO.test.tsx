import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SEO from "./SEO";

afterEach(() => {
  cleanup();
  document.head.innerHTML = "";
});

describe("Public page SEO", () => {
  it("uses the public domain and keeps complete search text", () => {
    const title = "Find lokale serviceydere til rengøring, håndværk og havearbejde | Serviceydere";
    const description = "En komplet beskrivelse af lokale serviceydere. ".repeat(5);
    render(<SEO title={title} description={description} canonicalPath="/virksomheder" />);
    expect(document.title).toBe(title);
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(description);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://serviceydere.dk/virksomheder");
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute("content")).toBe("https://serviceydere.dk/virksomheder");
  });

  it("updates a business domain without leaving stale metadata", () => {
    const props = { title: "Firma", description: "Virksomhedens service", canonicalPath: "/v/firma" };
    const { rerender } = render(<SEO {...props} keywords="rengøring" />);
    rerender(<SEO {...props} canonicalOrigin="firma.dk" canonicalAtRoot />);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://firma.dk/");
    expect(document.querySelector('meta[name="keywords"]')).toBeNull();
    expect(document.querySelectorAll('link[data-seo-hreflang="1"]')).toHaveLength(2);
  });
});