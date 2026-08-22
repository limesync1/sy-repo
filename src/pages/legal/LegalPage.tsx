import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import SEO from "@/components/SEO";
import ArticleHero from "@/components/landing/ArticleHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Search, Link2, Printer, ArrowUp, X, FileText, ShieldCheck, Cookie, FileSignature, Building2, ChevronRight,
} from "lucide-react";

/** Delt layout for de juridiske sider (/privatlivspolitik, /vilkaar,
 *  /cookies, /databehandleraftale, /underdatabehandlere).
 *
 *  Designmål: juridisk indhold skal være til at *bruge* — derfor
 *  læseprogress, dokument-skifter, søgning i teksten, scroll-spy i
 *  indholdsfortegnelsen, kopiér-link pr. afsnit og print/gem som PDF. */
type Section = { id: string; title: string; body: ReactNode };

type Props = {
  title: string;
  subtitle?: string;
  canonicalPath: string;
  description: string;
  updated: string;
  sections: Section[];
};

const DOCS = [
  { to: "/privatlivspolitik", label: "Privatlivspolitik", icon: ShieldCheck },
  { to: "/vilkaar", label: "Vilkår", icon: FileText },
  { to: "/cookies", label: "Cookies", icon: Cookie },
  { to: "/databehandleraftale", label: "Databehandleraftale", icon: FileSignature },
  { to: "/underdatabehandlere", label: "Underdatabehandlere", icon: Building2 },
];

/** Trækker ren tekst ud af et React-træ, så vi kan søge i afsnittene. */
const nodeText = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join(" ");
  const el = node as { props?: { children?: ReactNode } };
  if (el?.props?.children) return nodeText(el.props.children);
  return "";
};

const LegalPage = ({ title, subtitle, canonicalPath, description, updated, sections }: Props) => {
  const { pathname, hash } = useLocation();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(sections[0]?.id ?? null);
  const [progress, setProgress] = useState(0);
  const articleRef = useRef<HTMLDivElement>(null);

  // Søgefilter — matcher både overskrift og brødtekst.
  const searchable = useMemo(
    () => sections.map((s) => ({ id: s.id, text: `${s.title} ${nodeText(s.body)}`.toLowerCase() })),
    [sections],
  );
  const term = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (term.length < 2) return sections;
    const ids = new Set(searchable.filter((s) => s.text.includes(term)).map((s) => s.id));
    return sections.filter((s) => ids.has(s.id));
  }, [term, sections, searchable]);

  // Læseprogress over selve artiklen (ikke hele siden).
  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      const start = el.offsetTop - 120;
      const total = Math.max(el.offsetHeight - window.innerHeight + 240, 1);
      const pct = ((window.scrollY - start) / total) * 100;
      setProgress(Math.min(100, Math.max(0, pct)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [visible.length]);

  // Scroll-spy — markerer det afsnit man læser i indholdsfortegnelsen.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (inView) setActiveId(inView.target.id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );
    visible.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [visible]);

  // Deep-linking: hvis siden åbnes med et hash (fx delt link til et
  // bestemt afsnit), skal vi selv scrolle dertil — browserens indbyggede
  // hash-scroll rammer forkert pga. den sticky header og fordi indholdet
  // først er i DOM'en efter render. Vi venter til elementet findes.
  useEffect(() => {
    const id = hash.replace(/^#/, "");
    if (!id) return;
    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setActiveId(id);
      } else if (attempts < 20) {
        attempts += 1;
        window.requestAnimationFrame(tryScroll);
      }
    };
    tryScroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, pathname]);

  const copyLink = (id: string) => {
    const url = `${window.location.origin}${canonicalPath}#${id}`;
    navigator.clipboard?.writeText(url).then(
      () => toast.success("Link til afsnittet er kopieret"),
      () => toast.error("Kunne ikke kopiere linket"),
    );
  };

  const toc = (
    <nav className="space-y-1 text-sm">
      {visible.map((s, i) => {
        const active = activeId === s.id;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={active ? "true" : undefined}
            className={`flex items-start gap-2 rounded-lg px-2.5 py-2 transition-colors ${
              active
                ? "bg-accent/10 font-medium text-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <span className={`mt-0.5 w-5 shrink-0 text-[11px] tabular-nums ${active ? "text-accent" : "text-muted-foreground/70"}`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 leading-snug">{s.title}</span>
          </a>
        );
      })}
      {visible.length === 0 && (
        <p className="px-2.5 py-2 text-xs text-muted-foreground">Ingen afsnit matcher “{query}”.</p>
      )}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${title} – Serviceydere`} description={description} canonicalPath={canonicalPath} />
      <SiteNav />

      {/* Læse-progressbar — fæstnet lige under topnavigationen. */}
      <div className="sticky top-0 z-40 h-0.5 w-full bg-transparent print:hidden">
        <div
          className="h-full bg-accent transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
          aria-hidden
        />
      </div>

      <ArticleHero
        breadcrumbs={[{ label: "Forside", to: "/" }, { label: title }]}
        eyebrow={`Juridisk · Senest opdateret ${updated}`}
        title={title}
        subtitle={subtitle}
      />

      {/* Dokument-skifter — gør det tydeligt at de fem juridiske dokumenter
          hænger sammen, og at man kan hoppe imellem dem. */}
      <div className="border-b border-border bg-secondary/40 print:hidden">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          {DOCS.map((d) => {
            const active = pathname === d.to;
            return (
              <Link
                key={d.to}
                to={d.to}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-transparent bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground"
                }`}
              >
                <d.icon className="h-3.5 w-3.5" />
                {d.label}
              </Link>
            );
          })}
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Søg i dokumentet + print */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center print:hidden">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Søg i ${title.toLowerCase()} — fx “sletning”, “cookies”, “opsigelse”`}
              className="h-11 rounded-xl pl-9 pr-9 text-[15px]"
              aria-label={`Søg i ${title}`}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Ryd søgning"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            className="h-11 shrink-0 rounded-xl"
            onClick={() => window.print()}
          >
            <Printer className="mr-2 h-4 w-4" /> Gem som PDF
          </Button>
        </div>

        {term.length >= 2 && (
          <p className="mb-4 text-xs text-muted-foreground print:hidden">
            {visible.length} af {sections.length} afsnit matcher “{query}”.
          </p>
        )}

        {/* Mobil-indholdsfortegnelse */}
        <details className="mb-6 rounded-xl border border-border bg-card lg:hidden print:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-foreground">
            Indhold på siden
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </summary>
          <div className="border-t border-border p-2">{toc}</div>
        </details>

        <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden lg:block print:hidden">
            <div className="sticky top-24">
              <p className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Indhold
              </p>
              {toc}
              <div className="mt-6 rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Spørgsmål til aftalen?</p>
                <p className="mt-1 leading-relaxed">
                  Skriv til os, så vender vi tilbage inden for 1–2 hverdage.
                </p>
                <a
                  href="mailto:kontakt@serviceydere.dk"
                  className="mt-2 inline-block font-medium text-foreground underline-offset-2 hover:underline"
                >
                  kontakt@serviceydere.dk
                </a>
              </div>
            </div>
          </aside>

          <article ref={articleRef} className="min-w-0 max-w-none break-words text-foreground">
            {visible.map((s, i) => (
              <section key={s.id} id={s.id} className="group mb-8 scroll-mt-28">
                <div className="flex items-start gap-3">
                  <span className="mt-1 hidden h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-[11px] font-semibold tabular-nums text-accent sm:flex">
                    {String(sections.findIndex((x) => x.id === s.id) + 1).padStart(2, "0")}
                  </span>
                  <h2 className="flex min-w-0 flex-1 items-center gap-2 text-lg font-semibold tracking-[-0.01em] text-foreground sm:text-xl">
                    <span className="min-w-0">{s.title}</span>
                    <button
                      type="button"
                      onClick={() => copyLink(s.id)}
                      aria-label={`Kopiér link til ${s.title}`}
                      className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 print:hidden"
                    >
                      <Link2 className="h-4 w-4" />
                    </button>
                  </h2>
                </div>
                <div className="mt-3 space-y-3 rounded-xl border border-border bg-card p-4 text-[15px] leading-7 text-muted-foreground sm:ml-9 sm:p-5">
                  {s.body}
                </div>
              </section>
            ))}

            {visible.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                <p className="text-sm font-semibold text-foreground">Ingen afsnit matcher “{query}”</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Prøv et andet ord — eller skriv til os, så svarer vi direkte.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => setQuery("")}>
                  Ryd søgning
                </Button>
              </div>
            )}

            <section className="mt-10 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground sm:p-5">
                <p className="font-semibold text-foreground">Dataansvarlig</p>
                <p className="mt-1">Software og Full-service branding hos Adely Group</p>
                <p>CVR-nr.: 40543120</p>
                <p>Domæne: serviceydere.dk</p>
                <p>
                  Kontakt:{" "}
                  <a href="mailto:kontakt@serviceydere.dk" className="text-foreground underline-offset-2 hover:underline">
                    kontakt@serviceydere.dk
                  </a>
                </p>
              </div>
              <div className="rounded-xl border border-accent/25 bg-accent/5 p-4 text-sm text-muted-foreground sm:p-5">
                <p className="font-semibold text-foreground">Senest opdateret</p>
                <p className="mt-1">{updated}</p>
                <p className="mt-2 leading-relaxed">
                  Vi opdaterer dokumentet, når platformen eller lovgivningen ændrer sig, og varsler væsentlige
                  ændringer via e-mail til virksomhedsejere.
                </p>
              </div>
            </section>

            <div className="mt-8 flex justify-center print:hidden">
              <Button
                variant="ghost"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="text-muted-foreground"
              >
                <ArrowUp className="mr-2 h-4 w-4" /> Tilbage til toppen
              </Button>
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LegalPage;
