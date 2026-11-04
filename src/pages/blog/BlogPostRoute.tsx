import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import { useParams } from "react-router-dom";
import { BLOG_POSTS } from "./blogPosts";
import DynamicBlogPost from "./DynamicBlogPost";

// Hele artikelregistret (metadata for ~300 artikler) hentes kun, når en
// artikel åbnes — ikke på forsiden og de andre sider. Hver artikel beholder
// sin egen lille fil, og React.lazy-komponenten caches pr. slug, så
// Suspense ikke blinker ved gen-navigation.
const cache = new Map<string, LazyExoticComponent<ComponentType>>();
const bySlug = new Map(BLOG_POSTS.map((p) => [p.slug, p]));

export function loadBlogPostChunk(slug: string) {
  return bySlug.get(slug)?.loader() ?? Promise.resolve();
}

export default function BlogPostRoute() {
  const { slug = "" } = useParams();
  const post = bySlug.get(slug);
  if (!post) return <DynamicBlogPost />;
  let Component = cache.get(slug);
  if (!Component) {
    Component = lazy(post.loader as () => Promise<{ default: ComponentType }>);
    cache.set(slug, Component);
  }
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" aria-busy="true" />}>
      <Component />
    </Suspense>
  );
}
