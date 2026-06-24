import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import SmartLink from "@/components/SmartLink";
import { Shield, Users, MapPin, Mail, CheckCircle2, Sparkles, Building2, HeartHandshake } from "lucide-react";

const AboutUs = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Serviceydere",
      alternateName: "Serviceydere.dk",
      url: "https://serviceydere.dk/",
      logo: "https://serviceydere.dk/serviceydere-logo-dark.webp",
      description:
        "Serviceydere er en dansk platform der forbinder private og virksomheder med verificerede lokale serviceydere — rengøring, håndværker, flyttehjælp, haveservice og mere.",
      foundingDate: "2024",
      areaServed: { "@type": "Country", name: "Danmark" },
      contactPoint: {
        "@type": "ContactPoint",
        email: "kontakt@serviceydere.dk",
        contactType: "customer support",
        availableLanguage: ["Danish"],
      },
      sameAs: [],
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Om os", item: "https://serviceydere.dk/om-os" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "Om Serviceydere",
      url: "https://serviceydere.dk/om-os",
      inLanguage: "da-DK",
      description:
        "Lær Serviceydere at kende — vores mission, hvordan vi verificerer udbydere, og hvordan platformen hjælper danskere med at finde den rette serviceyder.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Om Serviceydere — Danmarks platform for verificerede serviceydere"
        description="Serviceydere forbinder danskere med verificerede lokale serviceydere — rengøring, håndværker, flyttehjælp, haveservice og mere. Læs om vores mission og hvordan vi arbejder."
        canonicalPath="/om-os"
        keywords="om serviceydere, serviceydere danmark, find lokal serviceyder, verificerede udbydere"
        jsonLd={jsonLd}
      />
      <SiteNav />

      <main id="main">
        {/* Hero */}
        <section className="bg-foreground text-background">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <nav aria-label="Brødkrumme" className="mb-6 text-sm text-background/60">
              <SmartLink to="/" className="hover:text-background">Forside</SmartLink>
              <span className="mx-2">/</span>
              <span className="text-background">Om os</span>
            </nav>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Vi gør det enklere at finde den rette serviceyder
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-7 text-background/80">
              Serviceydere er en dansk platform der forbinder private og virksomheder med
              verificerede lokale udbydere af rengøring, håndværk, flyttehjælp, haveservice og
              meget mere — i hele Danmark.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <SmartLink
                to="/virksomheder"
                className="inline-flex items-center justify-center rounded-full bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-background/90"
              >
                Find services
              </SmartLink>
              <SmartLink
                to="/tilbud"
                className="inline-flex items-center justify-center rounded-full border border-background/20 px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-background/10"
              >
                Indhent 3 tilbud
              </SmartLink>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/70">
                  <Sparkles className="h-3.5 w-3.5" /> Vores mission
                </span>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Tryghed, gennemsigtighed og lokal kvalitet
                </h2>
              </div>
              <div className="space-y-4 text-base leading-7 text-foreground/80">
                <p>
                  Hver dag bruger danskere timer på at finde, sammenligne og kontakte
                  serviceydere — uden at vide om udbyderen er pålidelig, om prisen er fair,
                  eller om kvaliteten holder. Det ville vi lave om på.
                </p>
                <p>
                  Serviceydere samler verificerede danske virksomheder ét sted, så du på få
                  minutter kan finde en lokal udbyder, sammenligne tilbud og booke med tryghed.
                  Vi tjekker CVR, kontaktoplysninger og — for de udbydere der har det — også
                  forsikring og certificeringer.
                </p>
                <p>
                  Det er <strong>gratis for private</strong> at bruge platformen. Vi tjener
                  vores penge ved at hjælpe seriøse virksomheder med at vækste.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Værdier */}
        <section className="bg-muted/30">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Sådan arbejder vi
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Shield,
                  title: "Verificerede udbydere",
                  text: "Vi tjekker CVR og kontaktoplysninger på alle virksomheder, der får et verificeret stempel.",
                },
                {
                  icon: Users,
                  title: "Lokal forankring",
                  text: "Udbydere i hele Danmark — fra København til Aalborg, Aarhus, Odense og alle byer imellem.",
                },
                {
                  icon: HeartHandshake,
                  title: "Fair priser",
                  text: "Gennemsigtige prisguides, så du kender markedsprisen før du beder om tilbud.",
                },
                {
                  icon: CheckCircle2,
                  title: "Uafhængig platform",
                  text: "Vi er ikke selv serviceyder — vi forbinder kun. Du vælger frit hvem du vil arbejde med.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-border bg-background p-6">
                  <Icon className="h-7 w-7 text-foreground" />
                  <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-foreground/70">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Nøgletal / NAP */}
        <section className="bg-background">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Serviceydere i tal
                </h2>
                <dl className="mt-8 grid grid-cols-2 gap-6">
                  <div>
                    <dt className="text-sm text-foreground/60">Kategorier</dt>
                    <dd className="mt-1 text-3xl font-bold text-foreground">25+</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-foreground/60">Byer i Danmark</dt>
                    <dd className="mt-1 text-3xl font-bold text-foreground">60+</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-foreground/60">Prisguides</dt>
                    <dd className="mt-1 text-3xl font-bold text-foreground">20+</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-foreground/60">Tilbud per forespørgsel</dt>
                    <dd className="mt-1 text-3xl font-bold text-foreground">op til 3</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-border bg-muted/30 p-6 sm:p-8">
                <h2 className="text-xl font-semibold text-foreground">Kontakt &amp; virksomhedsinfo</h2>
                <ul className="mt-5 space-y-4 text-sm">
                  <li className="flex items-start gap-3">
                    <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-foreground/60" />
                    <div>
                      <div className="font-semibold text-foreground">Serviceydere</div>
                      <div className="text-foreground/70">Dansk online platform</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-foreground/60" />
                    <div>
                      <div className="font-semibold text-foreground">Område</div>
                      <div className="text-foreground/70">Hele Danmark</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-foreground/60" />
                    <div>
                      <div className="font-semibold text-foreground">E-mail</div>
                      <a
                        href="mailto:kontakt@serviceydere.dk"
                        className="text-foreground/70 underline-offset-4 hover:underline"
                      >
                        kontakt@serviceydere.dk
                      </a>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-foreground text-background">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Klar til at finde den rette serviceyder?
                </h2>
                <p className="mt-3 max-w-2xl text-background/80">
                  Søg direkte eller få op til 3 gratis tilbud fra verificerede udbydere i dit område.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <SmartLink
                  to="/virksomheder"
                  className="inline-flex items-center justify-center rounded-full bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-background/90"
                >
                  Find services
                </SmartLink>
                <SmartLink
                  to="/tilbud"
                  className="inline-flex items-center justify-center rounded-full border border-background/20 px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-background/10"
                >
                  Indhent 3 tilbud
                </SmartLink>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutUs;