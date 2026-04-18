import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  /** Path part of canonical URL, e.g. "/search" — defaults to current path */
  canonicalPath?: string;
  /** Absolute or root-relative image URL for og:image / twitter:image */
  image?: string;
  /** og:type — defaults to "website" */
  ogType?: "website" | "article" | "profile" | "product";
  /** Comma-separated keywords */
  keywords?: string;
  /** Set to true for pages that shouldn't be indexed (e.g. dashboards) */
  noIndex?: boolean;
  /** Optional JSON-LD structured data object(s) — appended to <head> */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_NAME = "Serviceydere";
const DEFAULT_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/sI6LsXTFtPPIEDZVFqH1HMANgG93/social-images/social-1776054724008-serviceydere_(2).webp";

const setMeta = (selector: string, attr: "content" | "href", value: string) => {
  let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (!el) {
    if (selector.startsWith("link")) {
      el = document.createElement("link");
      const rel = selector.match(/rel="([^"]+)"/)?.[1];
      if (rel) (el as HTMLLinkElement).rel = rel;
    } else {
      el = document.createElement("meta");
      const name = selector.match(/name="([^"]+)"/)?.[1];
      const prop = selector.match(/property="([^"]+)"/)?.[1];
      if (name) (el as HTMLMetaElement).name = name;
      if (prop) (el as HTMLMetaElement).setAttribute("property", prop);
    }
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
  return el;
};

const SEO = ({
  title,
  description,
  canonicalPath,
  image = DEFAULT_IMAGE,
  ogType = "website",
  keywords,
  noIndex,
  jsonLd,
}: SEOProps) => {
  useEffect(() => {
    const prevTitle = document.title;
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle.length > 60 ? fullTitle.slice(0, 57) + "..." : fullTitle;

    const desc = description.length > 160 ? description.slice(0, 157) + "..." : description;
    const url = `${window.location.origin}${canonicalPath ?? window.location.pathname}`;
    const absImage = image.startsWith("http") ? image : `${window.location.origin}${image}`;

    setMeta('meta[name="description"]', "content", desc);
    setMeta('link[rel="canonical"]', "href", url);
    setMeta('meta[name="robots"]', "content", noIndex ? "noindex,nofollow" : "index,follow");
    if (keywords) setMeta('meta[name="keywords"]', "content", keywords);

    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:type"]', "content", ogType);
    setMeta('meta[property="og:image"]', "content", absImage);
    setMeta('meta[property="og:site_name"]', "content", SITE_NAME);
    setMeta('meta[property="og:locale"]', "content", "da_DK");

    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "content", fullTitle);
    setMeta('meta[name="twitter:description"]', "content", desc);
    setMeta('meta[name="twitter:image"]', "content", absImage);

    // JSON-LD
    const scripts: HTMLScriptElement[] = [];
    if (jsonLd) {
      const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      items.forEach((data) => {
        const s = document.createElement("script");
        s.type = "application/ld+json";
        s.textContent = JSON.stringify(data);
        s.dataset.seo = "1";
        document.head.appendChild(s);
        scripts.push(s);
      });
    }

    return () => {
      document.title = prevTitle;
      scripts.forEach((s) => s.remove());
    };
  }, [title, description, canonicalPath, image, ogType, keywords, noIndex, jsonLd]);

  return null;
};

export default SEO;
