import { ReactNode } from "react";
import { Link } from "react-router-dom";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import SEO from "@/components/SEO";
import ArticleHero from "@/components/landing/ArticleHero";

/** Delt layout for /privatlivspolitik, /vilkaar og /cookies.
 *  Holder en konsistent typografi, sidebar med ankerlinks og fodnote
 *  med juridiske oplysninger om Serviceydere ApS (CVR 40543120). */
type Section = { id: string; title: string; body: ReactNode };

type Props = {
  title: string;
  subtitle?: string;
  canonicalPath: string;
  description: string;
  updated: string;
  sections: Section[];
};

const LegalPage = ({ title, subtitle, canonicalPath, description, updated, sections }: Props) => {
  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${title} – Serviceydere`} description={description} canonicalPath={canonicalPath} />
      <SiteNav />
      <ArticleHero
        breadcrumbs={[{ label: "Forside", to: "/" }, { label: title }]}
        eyebrow={`Juridisk · Senest opdateret ${updated}`}
        title={title}
        subtitle={subtitle}
      />

      <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Mobil-indhold: sammenklappelig indholdsfortegnelse i stedet for
            sidebaren, som er skjult under lg. */}
        <details className="mb-6 rounded-xl border border-border bg-card lg:hidden">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground">
            Indhold på siden
          </summary>
          <nav className="border-t border-border px-2 py-2">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {s.title}
              </a>
            ))}
          </nav>
        </details>

        <div className="grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1 text-sm">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Indhold</p>
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {s.title}
                </a>
              ))}
              <div className="mt-6 border-t border-border pt-4 space-y-1.5 text-xs text-muted-foreground">
                <Link to="/privatlivspolitik" className="block hover:text-foreground">Privatlivspolitik</Link>
                <Link to="/vilkaar" className="block hover:text-foreground">Vilkår</Link>
                <Link to="/cookies" className="block hover:text-foreground">Cookies</Link>
                <Link to="/databehandleraftale" className="block hover:text-foreground">Databehandleraftale</Link>
                <Link to="/underdatabehandlere" className="block hover:text-foreground">Underdatabehandlere</Link>
              </div>
            </nav>
          </aside>

          <article className="prose prose-sm min-w-0 max-w-none break-words text-foreground">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24 mb-10">
                <h2 className="text-lg font-semibold text-foreground sm:text-xl">{s.title}</h2>
                <div className="mt-3 space-y-3 text-[15px] leading-7 text-muted-foreground sm:text-sm">
                  {s.body}
                </div>
              </section>
            ))}

            <section className="mt-12 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground sm:p-5">
              <p className="font-semibold text-foreground">Dataansvarlig</p>
              <p className="mt-1">Software og Full-service branding hos Adely Group</p>
              <p>CVR-nr.: 40543120</p>
              <p>Domæne: serviceydere.dk</p>
              <p>Kontakt: <a href="mailto:kontakt@serviceydere.dk" className="text-foreground underline-offset-2 hover:underline">kontakt@serviceydere.dk</a></p>
            </section>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LegalPage;