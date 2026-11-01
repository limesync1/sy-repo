import { BLOG_POSTS } from "../pages/blog/blogPosts";
import { normalizeCategory } from "../pages/blog/blogCategories";
import { GUIDES } from "../pages/guides/guidesRegistry";

const HUBS: Record<string, string> = {
  "Rengøring": "/guides/rengoering", "Flyttehjælp": "/guides/flytning",
  "Håndværker": "/guides/haandvaerker", "Tømrer": "/guides/haandvaerker",
  "Murer": "/guides/haandvaerker", "Maler": "/guides/haandvaerker",
  "Elektriker": "/guides/haandvaerker", "VVS": "/guides/haandvaerker",
  "Gulvlægger": "/guides/haandvaerker", "Haveservice": "/guides/have",
  "Anlægsgartner": "/guides/have", "Økonomi": "/guides/priser-2026",
  "Vinduespudsning": "/guides/vinduespudsning",
};

/** Browser and initial HTML use the same relevant, stable topic links. */
export function relatedContent(category: string | undefined, currentPath: string) {
  const topic = category ? normalizeCategory(category) : undefined;
  const seed = Array.from(currentPath).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rotate = <T,>(items: T[]) => {
    if (!items.length) return items;
    const offset = seed % items.length;
    return [...items.slice(offset), ...items.slice(0, offset)];
  };
  const hub = topic ? HUBS[topic] : undefined;
  const guides = GUIDES.filter(g => g.href !== currentPath && (!topic || normalizeCategory(g.category) === topic || g.href === hub));
  const posts = BLOG_POSTS.filter(p => `/blog/${p.slug}` !== currentPath && (!topic || normalizeCategory(p.category) === topic));
  return {
    guides: [...guides.filter(g => g.href === hub), ...rotate(guides.filter(g => g.href !== hub))].slice(0, 3),
    posts: rotate(posts).slice(0, 3),
  };
}