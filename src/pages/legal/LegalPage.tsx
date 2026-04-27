import { ReactNode } from "react";
import { Link } from "react-router-dom";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import SEO from "@/components/SEO";

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

      <header className="border-b border-border bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Juridisk</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-3 max-w-2xl text-base text-muted-foreground">{subtitle}</p>}
          <p className="mt-4 text-xs text-muted-foreground">Senest opdateret: {updated}</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
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
              </div>
            </nav>
          </aside>

          <article className="prose prose-sm max-w-none text-foreground">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24 mb-10">
                <h2 className="text-xl font-semibold text-foreground">{s.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
                  {s.body}
                </div>
              </section>
            ))}

            <section className="mt-12 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
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