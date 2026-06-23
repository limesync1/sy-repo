interface ArticleFaqSectionProps {
  items: { q: string; a: string }[];
  title?: string;
}

const ArticleFaqSection = ({ items, title = "Ofte stillede spørgsmål" }: ArticleFaqSectionProps) => {
  if (!items.length) return null;

  return (
    <section className="not-prose my-12" aria-labelledby="article-faq-heading">
      <div className="mb-5 border-t border-border pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">FAQ</p>
        <h2 id="article-faq-heading" className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
      </div>

      <div className="grid gap-3">
        {items.map((item, index) => (
          <details
            key={item.q}
            className="group rounded-xl border border-border bg-card shadow-panel open:bg-muted/30"
            open={index === 0}
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 text-base font-semibold text-foreground transition hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
              <span>{item.q}</span>
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border text-sm text-muted-foreground transition group-open:rotate-45 group-open:text-foreground">
                +
              </span>
            </summary>
            <div className="border-t border-border px-5 py-4 text-sm leading-7 text-muted-foreground sm:text-base">
              {item.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
};

export default ArticleFaqSection;