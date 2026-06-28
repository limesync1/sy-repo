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
        {/* Hero — Ocean Deep */}
        <section className="relative isolate overflow-hidden text-background">
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(80% 60% at 85% 0%, hsl(var(--hero-cyan) / 0.35), transparent 60%), radial-gradient(60% 50% at 0% 100%, hsl(var(--hero-mid) / 0.55), transparent 65%), linear-gradient(160deg, hsl(var(--hero-bg)) 0%, hsl(204 80% 8%) 100%)",
            }}
            aria-hidden
          />
          <div
            className="absolute inset-0 -z-10 opacity-[0.12] mix-blend-overlay"
            style={{
              backgroundImage:
                "radial-gradient(hsl(var(--hero-cyan-bright)) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
            aria-hidden
          />

          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
            <nav aria-label="Brødkrumme" className="mb-8 text-sm text-background/60">
              <SmartLink to="/" className="hover:text-background">Forside</SmartLink>
              <span className="mx-2">/</span>
              <span className="text-background">Anmeldelser</span>
            </nav>

            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-background/15 bg-background/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-background/80 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--hero-cyan-bright))] shadow-[0_0_12px_hsl(var(--hero-cyan-bright))]" />
                Kvalitet &amp; tryghed
              </span>
              <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Anmeldelser fra rigtige{" "}
                <span className="bg-gradient-to-r from-[hsl(var(--hero-cyan-bright))] to-background bg-clip-text text-transparent">
                  kunder
                </span>{" "}
                — på vej
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-background/80">
                Serviceydere er en ny dansk platform. Vi viser kun anmeldelser, der kommer
                fra reelle kunder med en gennemført opgave — derfor er der endnu ikke
                offentlige anmeldelser at vise her. I mellemtiden kan du læse om, hvordan
                vi verificerer hver enkelt udbyder.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <SmartLink
                  to="/tilbud"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-background px-6 py-3 text-sm font-semibold text-foreground hover:bg-background/90"
                >
                  Indhent 3 tilbud <ArrowRight className="h-4 w-4" />
                </SmartLink>
                <a
                  href="mailto:kontakt@serviceydere.dk?subject=Min%20oplevelse%20med%20Serviceydere"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-background/25 bg-background/5 px-6 py-3 text-sm font-semibold text-background backdrop-blur hover:bg-background/10"
                >
                  <Mail className="h-4 w-4" /> Del din oplevelse
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Trust-icons stribe */}
        <section className="border-b border-border bg-background">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {[
              { icon: ShieldCheck, label: "CVR-verificerede firmaer", body: "Vi tjekker CVR, branche og status før et firma kommer på platformen." },
              { icon: BadgeCheck, label: "Oplyste forsikringer", body: "Udbydere kan dokumentere forsikring og certificeringer direkte på deres profil." },
              { icon: MessageSquare, label: "Direkte kontakt", body: "Du kommunikerer direkte med firmaet — ingen mellemled der forsinker." },
              { icon: Star, label: "Kun rigtige anmeldelser", body: "Når anmeldelser går live, kommer de udelukkende fra kunder med en gennemført opgave." },
            ].map(({ icon: Icon, label, body }) => (
              <div key={label} className="group flex items-start gap-3 rounded-2xl p-3 transition-colors hover:bg-muted/40">
                <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--hero-bg))] text-background ring-1 ring-[hsl(var(--hero-cyan)/0.35)]">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sådan virker anmeldelser */}
        <section className="bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <div className="mb-10 max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--accent))]">
                Sådan kommer anmeldelser til at virke
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Anmeldelser knyttet til en reel opgave
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Vi vil hellere have få ærlige anmeldelser end mange opdigtede. Derfor
                viser vi først anmeldelser her, når de er knyttet til en gennemført
                opgave fra platformen.
              </p>
            </div>

            <ol className="grid gap-5 sm:grid-cols-3">
              {[
                { n: "01", title: "Opgaven gennemføres", text: "Kunden bestiller en service via en udbyders profil eller gennem tilbudsflowet." },
                { n: "02", title: "Kunden inviteres", text: "Efter opgaven sender vi en invitation til at vurdere udbyderen — 1–5 stjerner og en kort kommentar." },
                { n: "03", title: "Anmeldelsen offentliggøres", text: "Anmeldelsen vises på udbyderens profil og indgår i den samlede vurdering." },
              ].map((s) => (
                <li key={s.n} className="rounded-2xl border border-border bg-card p-6 shadow-panel">
                  <span className="text-xs font-mono text-muted-foreground">{s.n}</span>
                  <h3 className="mt-2 text-base font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ol>

            <div className="mt-12">
              <LocalQuoteWidget
                heading="Prøv selv — find 3 udbydere på under 24 timer"
                description="Vælg service og by — vi sender dig direkte ind i tilbudsflowet."
              />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Reviews;