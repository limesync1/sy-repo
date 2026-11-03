import { Link } from "react-router-dom";
import type { ArticleImage } from "@/lib/article-images";

interface Props {
  slug: string;
  title: string;
  description: string;
  category: string;
  readingMinutes: number;
  image?: ArticleImage;
}

/** Shared blog list card: fixed 3:2 image frame (placeholder until the cover exists) so the grid never shifts. */
const BlogPostCard = ({ slug, title, description, category, readingMinutes, image }: Props) => (
  <Link
    to={`/blog/${slug}`}
    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <div className="aspect-[3/2] w-full overflow-hidden bg-muted">
      {image ? (
        <img
          src={image.image_url}
          alt={image.alt ?? title}
          width={1536}
          height={1024}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-primary/10 via-muted to-accent/10" aria-hidden="true" />
      )}
    </div>
    <div className="flex flex-1 flex-col p-5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</span>
      <h2 className="mt-2 text-lg font-semibold leading-snug text-foreground group-hover:underline">{title}</h2>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <span className="mt-auto pt-4 text-xs font-medium text-muted-foreground">{readingMinutes} min læsning</span>
    </div>
  </Link>
);

export default BlogPostCard;
