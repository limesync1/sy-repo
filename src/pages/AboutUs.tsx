import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import SmartLink from "@/components/SmartLink";
import { Shield, Users, MapPin, Mail, CheckCircle2, Sparkles, Building2, HeartHandshake, ArrowRight } from "lucide-react";

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
        {/* Hero — Ocean Deep */}
        <section className="relative isolate overflow-hidden text-background">
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(70% 55% at 90% 10%, hsl(var(--hero-cyan) / 0.32), transparent 60%), radial-gradient(55% 45% at 0% 90%, hsl(var(--hero-mid) / 0.5), transparent 65%), linear-gradient(160deg, hsl(var(--hero-bg)) 0%, hsl(204 80% 8%) 100%)",
            }}
            aria-hidden
          />
          <div
            className="absolute inset-0 -z-10 opacity-[0.10] mix-blend-overlay"
            style={{
              backgroundImage:
                "radial-gradient(hsl(var(--hero-cyan-bright)) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
            aria-hidden
          />
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
            <nav aria-label="Brødkrumme" className="mb-8 text-sm text-background/60">
              <SmartLink to="/" className="hover:text-background">Forside</SmartLink>
              <span className="mx-2">/</span>
              <span className="text-background">Om os</span>
            </nav>
            <span className="inline-flex items-center gap-2 rounded-full border border-background/15 bg-background/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-background/80 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--hero-cyan-bright))] shadow-[0_0_12px_hsl(var(--hero-cyan-bright))]" />
              Dansk platform · hele Danmark
            </span>
            <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Vi gør det enklere at finde{" "}
              <span className="bg-gradient-to-r from-[hsl(var(--hero-cyan-bright))] to-background bg-clip-text text-transparent">
                den rette serviceyder
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-background/80">
              Serviceydere forbinder private og virksomheder med verificerede lokale udbydere
              af rengøring, håndværk, flyttehjælp, haveservice og meget mere — i hele Danmark.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <SmartLink
                to="/virksomheder"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-background px-6 py-3 text-sm font-semibold text-foreground transition-all hover:gap-3 hover:bg-background/90"
              >
                Find services
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </SmartLink>
              <SmartLink
                to="/tilbud"
                className="inline-flex items-center justify-center rounded-full border border-background/25 bg-background/5 px-6 py-3 text-sm font-semibold text-background backdrop-blur transition-colors hover:bg-background/10"
              >
                Indhent 3 tilbud
              </SmartLink>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="relative border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent-soft))] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[hsl(var(--accent))]">
                  <Sparkles className="h-3.5 w-3.5" /> Vores mission
                </span>
                <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
                  Tryghed, gennemsigtighed og lokal kvalitet
                </h2>
                <div className="mt-6 h-1 w-16 rounded-full bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--hero-cyan))]" />
              </div>
              <div className="space-y-5 text-base leading-8 text-foreground/80">
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
                <p className="rounded-2xl border-l-4 border-[hsl(var(--accent))] bg-muted/40 p-4 text-foreground">
                  Det er <strong>gratis for private</strong> at bruge platformen. Vi tjener
                  vores penge ved at hjælpe seriøse virksomheder med at vækste.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Værdier */}
        <section className="bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mb-10 max-w-2xl">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--accent))]">
                Vores principper
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Sådan arbejder vi
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Fire principper der gælder for hver eneste udbyder og hver eneste forespørgsel på platformen.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
              ].map(({ icon: Icon, title, text }, i) => (
                <div
                  key={title}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-background p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[hsl(var(--accent)/0.4)] hover:shadow-[0_20px_50px_-20px_hsl(var(--hero-bg)/0.25)]"
                >
                  <span className="absolute right-5 top-5 text-xs font-mono text-muted-foreground/40">
                    0{i + 1}
                  </span>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--hero-bg))] text-background ring-1 ring-[hsl(var(--hero-cyan)/0.35)]">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-foreground/70">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Nøgletal / NAP */}
        <section className="bg-background">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--accent))]">
                  I tal
                </span>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Serviceydere i tal
                </h2>
                <dl className="mt-8 grid grid-cols-2 gap-4">
                  {[
                    { label: "Servicekategorier", value: "25+" },
                    { label: "Byer dækket", value: "50+" },
                    { label: "Prisguides", value: "25+" },
                    { label: "Tilbud per opgave", value: "op til 3" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-2xl border border-border bg-muted/30 p-5"
                    >
                      <dt className="text-xs uppercase tracking-wide text-foreground/60">{s.label}</dt>
                      <dd className="mt-2 bg-gradient-to-br from-foreground to-[hsl(var(--hero-mid))] bg-clip-text text-4xl font-bold text-transparent">
                        {s.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div
                className="relative overflow-hidden rounded-3xl border border-border p-7 text-background sm:p-9"
                style={{
                  background:
                    "linear-gradient(160deg, hsl(var(--hero-bg)) 0%, hsl(204 70% 14%) 100%)",
                }}
              >
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-50 blur-3xl"
                  style={{ background: "hsl(var(--hero-cyan) / 0.35)" }}
                  aria-hidden
                />
                <h2 className="text-xl font-semibold text-background">Kontakt &amp; virksomhedsinfo</h2>
                <p className="mt-1 text-sm text-background/65">Vi svarer typisk inden for én arbejdsdag.</p>
                <ul className="mt-6 space-y-4 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/10 text-[hsl(var(--hero-cyan-bright))]">
                      <Building2 className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <div className="font-semibold text-background">Serviceydere</div>
                      <div className="text-background/70">Online markedsplads for håndværk, rengøring &amp; service</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/10 text-[hsl(var(--hero-cyan-bright))]">
                      <MapPin className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <div className="font-semibold text-background">Område</div>
                      <div className="text-background/70">Hele Danmark</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/10 text-[hsl(var(--hero-cyan-bright))]">
                      <Mail className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <div className="font-semibold text-background">E-mail</div>
                      <a
                        href="mailto:kontakt@serviceydere.dk"
                        className="text-background/75 underline-offset-4 hover:text-background hover:underline"
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
        <section className="relative isolate overflow-hidden text-background">
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(60% 80% at 100% 50%, hsl(var(--hero-cyan) / 0.3), transparent 60%), linear-gradient(135deg, hsl(var(--hero-bg)) 0%, hsl(204 80% 10%) 100%)",
            }}
            aria-hidden
          />
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Klar til at finde den rette serviceyder?
                </h2>
                <p className="mt-4 max-w-2xl text-lg text-background/80">
                  Søg direkte eller få op til 3 gratis tilbud fra verificerede udbydere i dit område.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <SmartLink
                  to="/virksomheder"
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-background px-6 py-3 text-sm font-semibold text-foreground transition-all hover:gap-3 hover:bg-background/90"
                >
                  Find services
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </SmartLink>
                <SmartLink
                  to="/tilbud"
                  className="inline-flex items-center justify-center rounded-full border border-background/25 bg-background/5 px-6 py-3 text-sm font-semibold text-background backdrop-blur transition-colors hover:bg-background/10"
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
