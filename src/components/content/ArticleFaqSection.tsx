interface ArticleFaqSectionProps {
  items: { q: string; a: string }[];
  title?: string;
}

const ArticleFaqSection = ({ items, title = "Ofte stillede spørgsmål" }: ArticleFaqSectionProps) => {
  if (!items.length) return null;

  return (
    <section className="not-prose my-14 rounded-2xl border border-border bg-muted/30 p-5 shadow-panel sm:p-6 lg:p-8" aria-labelledby="article-faq-heading">
      <div className="mb-6 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">FAQ</p>
        <h2 id="article-faq-heading" className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Korte svar på de spørgsmål, brugere typisk stiller, før de indhenter tilbud.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((item, index) => (
          <details
            key={item.q}
            className="group rounded-xl border border-border bg-card shadow-sm transition-colors open:bg-background"
            open={index === 0}
          >
            <summary className="flex min-h-[4.5rem] cursor-pointer list-none items-start justify-between gap-4 rounded-xl px-5 py-4 text-base font-semibold leading-6 text-foreground transition hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
              <span>{item.q}</span>
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border bg-background text-sm text-muted-foreground transition group-open:rotate-45 group-open:text-foreground">
                +
              </span>
            </summary>
            <div className="border-t border-border px-5 py-4 text-sm leading-7 text-muted-foreground">
              {item.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
};

export default ArticleFaqSection;