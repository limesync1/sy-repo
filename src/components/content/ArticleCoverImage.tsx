import type { ArticleImage } from "@/lib/article-images";

/** Fixed 3:2 frame so the article never shifts while the cover loads. */
const ArticleCoverImage = ({ image, title }: { image?: ArticleImage; title: string }) => {
  if (!image) return null;
  return (
    <figure className="not-prose mb-8 overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
      <img
        src={image.image_url}
        alt={image.alt ?? title}
        width={1536}
        height={1024}
        fetchPriority="high"
        decoding="async"
        className="aspect-[3/2] w-full object-cover"
      />
    </figure>
  );
};

export default ArticleCoverImage;
