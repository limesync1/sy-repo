import { describe, it, expect } from "vitest";
import { relatedContent } from "./related-content";
import { BLOG_POSTS } from "../pages/blog/blogPosts";
import { normalizeCategory } from "../pages/blog/blogCategories";

describe("related articles", () => {
  it("gives every article in a category of 4+ at least 3 inbound links", () => {
    const inbound = new Map<string, number>();
    for (const p of BLOG_POSTS) {
      for (const r of relatedContent(p.category, `/blog/${p.slug}`).posts) {
        inbound.set(r.slug, (inbound.get(r.slug) ?? 0) + 1);
      }
    }
    const size = (c: string) => BLOG_POSTS.filter(p => normalizeCategory(p.category) === normalizeCategory(c)).length;
    const weak = BLOG_POSTS.filter(p => size(p.category) >= 4 && (inbound.get(p.slug) ?? 0) < 3);
    expect(weak.map(p => p.slug)).toEqual([]);
  });
});
