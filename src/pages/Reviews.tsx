import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import SmartLink from "@/components/SmartLink";
import LocalQuoteWidget from "@/components/conversion/LocalQuoteWidget";
import { ShieldCheck, MessageSquare, BadgeCheck, Star, Mail, ArrowRight } from "lucide-react";

const Reviews = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Anmeldelser", item: "https://serviceydere.dk/anmeldelser" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Anmeldelser af Serviceydere — sådan sikrer vi kvalitet"
        description="Anmeldelser og kundeoplevelser på Serviceydere er på vej. Læs hvordan vi verificerer udbydere via CVR, og hvordan anmeldelser kommer til at fungere på platformen."
        canonicalPath="/anmeldelser"
        keywords="serviceydere anmeldelser, kundeanmeldelser, erfaringer serviceydere, kvalitetssikring"
        jsonLd={jsonLd}
      />
      <SiteNav />

      <main id="main">
        {/* HERO — editorial dark */}
        <section className="relative overflow-hidden bg-[hsl(var(--hero-bg))] text-background">
          <div aria-hidden className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-[hsl(var(--accent)/0.18)] to-transparent" />
          <div aria-hidden className="absolute left-0 top-0 h-[2px] w-32 bg-[hsl(var(--accent))]" />
          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
            <nav aria-label="Brødkrumme" className="mb-10 text-xs font-medium text-background/55">
              <SmartLink to="/" className="hover:text-background">Forside</SmartLink>
              <span className="mx-2 text-background/30">/</span>
              <span className="text-background/80">Anmeldelser</span>
            </nav>
            <span className="mb-6 block text-[11px] font-bold uppercase tracking-[0.28em] text-[hsl(var(--accent))]">
              Kvalitet &amp; tryghed
            </span>
            <h1 className="max-w-4xl text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Anmeldelser fra rigtige kunder — på vej.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-background/75">
              Serviceydere er en ny dansk platform. Vi viser kun anmeldelser, der kommer
              fra reelle kunder med en gennemført opgave — derfor er der endnu ikke
              offentlige anmeldelser at vise her. I mellemtiden kan du læse om, hvordan
              vi verificerer hver enkelt udbyder.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <SmartLink
                to="/tilbud"
                className="group inline-flex items-center justify-center gap-2 bg-[hsl(var(--accent))] px-7 py-4 text-sm font-bold uppercase tracking-wider text-[hsl(var(--hero-bg))] hover:opacity-90"
              >
                Indhent 3 tilbud <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </SmartLink>
              <a
                href="mailto:kontakt@serviceydere.dk?subject=Min%20oplevelse%20med%20Serviceydere"
                className="inline-flex items-center justify-center gap-2 border border-background/25 px-7 py-4 text-sm font-bold uppercase tracking-wider text-background hover:bg-background/5"
              >
                <Mail className="h-4 w-4" /> Del din oplevelse
              </a>
            </div>
          </div>
        </section>

        {/* TRUST — hairline grid */}
        <section className="bg-background">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[hsl(var(--accent))]">
                  Kvalitetsfilter
                </span>
                <h2 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight text-foreground sm:text-5xl">
                  Sådan sikrer vi kvaliteten
                </h2>
              </div>
              <p className="max-w-sm text-sm text-muted-foreground">
                Fire ting vi tjekker — eller insisterer på — før et firma er synligt på platformen.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: ShieldCheck, label: "CVR-verificerede firmaer", body: "Vi tjekker CVR, branche og status før et firma kommer på platformen." },
                { icon: BadgeCheck, label: "Oplyste forsikringer", body: "Udbydere kan dokumentere forsikring og certificeringer direkte på deres profil." },
                { icon: MessageSquare, label: "Direkte kontakt", body: "Du kommunikerer direkte med firmaet — ingen mellemled der forsinker." },
                { icon: Star, label: "Kun rigtige anmeldelser", body: "Når anmeldelser går live, kommer de udelukkende fra kunder med en gennemført opgave." },
              ].map(({ icon: Icon, label, body }, i) => (
                <div key={label} className="group bg-card p-8 transition-colors hover:bg-muted/40">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-10 w-10 items-center justify-center bg-foreground text-background">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-xs text-[hsl(var(--accent))]">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="mt-6 text-base font-bold tracking-tight text-foreground">{label}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* STEPS — editorial how-it-works */}
        <section className="border-y border-border bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mb-10 grid gap-6 lg:grid-cols-[0.9fr_1.4fr] lg:gap-20">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[hsl(var(--accent))]">
                  Sådan virker anmeldelser
                </span>
                <h2 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight text-foreground sm:text-5xl">
                  Knyttet til en reel opgave
                </h2>
              </div>
              <p className="text-base leading-7 text-muted-foreground lg:pt-2">
                Vi vil hellere have få ærlige anmeldelser end mange opdigtede. Derfor viser vi
                først anmeldelser her, når de er knyttet til en gennemført opgave fra platformen.
              </p>
            </div>
            <ol className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-3">
              {[
                { n: "01", title: "Opgaven gennemføres", text: "Kunden bestiller en service via en udbyders profil eller gennem tilbudsflowet." },
                { n: "02", title: "Kunden inviteres", text: "Efter opgaven sender vi en invitation til at vurdere udbyderen — 1–5 stjerner og en kort kommentar." },
                { n: "03", title: "Anmeldelsen offentliggøres", text: "Anmeldelsen vises på udbyderens profil og indgår i den samlede vurdering." },
              ].map((s) => (
                <li key={s.n} className="bg-card p-8">
                  <span className="block font-mono text-xs text-[hsl(var(--accent))]">{s.n}</span>
                  <h3 className="mt-4 text-lg font-bold tracking-tight text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* WIDGET CTA */}
        <section className="bg-background py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <LocalQuoteWidget
              heading="Prøv selv — beskriv opgaven, modtag op til 3 tilbud"
              description="Vælg service og by — vi sender dig direkte ind i tilbudsflowet."
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Reviews;