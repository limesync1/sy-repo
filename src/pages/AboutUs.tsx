import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import SmartLink from "@/components/SmartLink";
import { Shield, Users, MapPin, Mail, CheckCircle2, Building2, HeartHandshake, ArrowRight } from "lucide-react";

const PRINCIPLES = [
  { icon: Shield, title: "Verificerede udbydere", text: "Vi tjekker CVR og kontaktoplysninger på alle virksomheder, der får et verificeret stempel." },
  { icon: Users, title: "Lokal forankring", text: "Udbydere i hele Danmark — fra København til Aalborg, Aarhus, Odense og alle byer imellem." },
  { icon: HeartHandshake, title: "Fair priser", text: "Gennemsigtige prisguides, så du kender markedsprisen før du beder om tilbud." },
  { icon: CheckCircle2, title: "Uafhængig platform", text: "Vi er ikke selv serviceyder — vi forbinder kun. Du vælger frit hvem du vil arbejde med." },
];

const STATS = [
  { label: "Servicekategorier", value: "25+" },
  { label: "Byer dækket", value: "50+" },
  { label: "Prisguides", value: "25+" },
  { label: "Tilbud per opgave", value: "op til 3" },
];

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
        {/* HERO — editorial dark */}
        <section className="relative overflow-hidden bg-[hsl(var(--hero-bg))] text-background">
          <div aria-hidden className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-[hsl(var(--accent)/0.18)] to-transparent" />
          <div aria-hidden className="absolute left-0 top-0 h-[2px] w-32 bg-[hsl(var(--accent))]" />
          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
            <nav aria-label="Brødkrumme" className="mb-10 text-xs font-medium text-background/55">
              <SmartLink to="/" className="hover:text-background">Forside</SmartLink>
              <span className="mx-2 text-background/30">/</span>
              <span className="text-background/80">Om os</span>
            </nav>
            <span className="mb-6 block text-[11px] font-bold uppercase tracking-[0.28em] text-[hsl(var(--accent))]">
              Om Serviceydere
            </span>
            <h1 className="max-w-4xl text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Vi gør det enklere at finde den rette serviceyder i Danmark.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-background/75">
              Serviceydere forbinder private og virksomheder med verificerede lokale udbydere
              af rengøring, håndværk, flyttehjælp, haveservice og meget mere — i hele Danmark.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <SmartLink
                to="/virksomheder"
                className="group inline-flex items-center justify-center gap-2 bg-[hsl(var(--accent))] px-7 py-4 text-sm font-bold uppercase tracking-wider text-[hsl(var(--hero-bg))] transition hover:opacity-90"
              >
                Find services <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </SmartLink>
              <SmartLink
                to="/tilbud"
                className="inline-flex items-center justify-center border border-background/25 px-7 py-4 text-sm font-bold uppercase tracking-wider text-background transition hover:bg-background/5"
              >
                Indhent 3 tilbud
              </SmartLink>
            </div>
          </div>
        </section>

        {/* STATS BAND — typografisk, hairlines */}
        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <dl className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label} className="border-l-2 border-[hsl(var(--accent))] pl-5">
                  <dd className="text-4xl font-black tabular-nums tracking-tight text-foreground">{s.value}</dd>
                  <dt className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* MISSION — editorial split */}
        <section className="bg-background">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="grid gap-12 border-b border-border pb-16 lg:grid-cols-[0.9fr_1.4fr] lg:gap-20">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[hsl(var(--accent))]">
                  Mission
                </span>
                <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight text-foreground sm:text-5xl">
                  Tryghed, gennemsigtighed og lokal kvalitet.
                </h2>
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
                <p className="border-l-2 border-[hsl(var(--accent))] bg-muted/30 px-5 py-4 text-foreground">
                  Det er <strong>gratis for private</strong> at bruge platformen. Vi tjener
                  vores penge ved at hjælpe seriøse virksomheder med at vækste.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PRINCIPLES — hairline grid */}
        <section className="bg-background">
          <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[hsl(var(--accent))]">
                  Principper
                </span>
                <h2 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight text-foreground sm:text-5xl">
                  Sådan arbejder vi
                </h2>
              </div>
              <p className="max-w-sm text-sm text-muted-foreground">
                Fire principper der gælder for hver eneste udbyder og hver eneste forespørgsel på platformen.
              </p>
            </div>
            <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {PRINCIPLES.map(({ icon: Icon, title, text }, i) => (
                <div key={title} className="group relative bg-card p-8 transition-colors hover:bg-muted/40">
                  <span className="mb-6 block font-mono text-xs text-[hsl(var(--accent))]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="mb-5 inline-flex h-10 w-10 items-center justify-center bg-foreground text-background">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-bold tracking-tight text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT — editorial NAP, light */}
        <section className="border-y border-border bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.4fr] lg:gap-20">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[hsl(var(--accent))]">
                  Kontakt
                </span>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                  Kontakt &amp; virksomhedsinfo
                </h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Vi besvarer henvendelser løbende på hverdage.
                </p>
              </div>
              <dl className="grid gap-px bg-border sm:grid-cols-3">
                <div className="bg-background p-6">
                  <Building2 className="h-5 w-5 text-[hsl(var(--accent))]" />
                  <dt className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Platform</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">Serviceydere</dd>
                  <dd className="text-sm text-muted-foreground">Markedsplads for service &amp; håndværk</dd>
                </div>
                <div className="bg-background p-6">
                  <MapPin className="h-5 w-5 text-[hsl(var(--accent))]" />
                  <dt className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Område</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">Hele Danmark</dd>
                  <dd className="text-sm text-muted-foreground">Alle regioner og 50+ byer</dd>
                </div>
                <div className="bg-background p-6">
                  <Mail className="h-5 w-5 text-[hsl(var(--accent))]" />
                  <dt className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">E-mail</dt>
                  <dd className="mt-1">
                    <a
                      href="mailto:kontakt@serviceydere.dk"
                      className="text-sm font-semibold text-foreground underline-offset-4 hover:underline"
                    >
                      kontakt@serviceydere.dk
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* CTA — outlined dark panel */}
        <section className="bg-background py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden bg-[hsl(var(--hero-bg))] p-10 text-background sm:p-14">
              <div aria-hidden className="absolute left-0 top-0 h-[2px] w-32 bg-[hsl(var(--accent))]" />
              <div className="flex flex-col items-start justify-between gap-8 border border-background/10 p-8 sm:p-10 lg:flex-row lg:items-center">
                <div className="max-w-xl">
                  <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[hsl(var(--accent))]">
                    Kom i gang
                  </span>
                  <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                    Klar til at finde den rette serviceyder?
                  </h2>
                  <p className="mt-3 text-base text-background/75">
                    Søg direkte — eller få op til 3 gratis tilbud fra verificerede udbydere i dit område.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <SmartLink
                    to="/virksomheder"
                    className="inline-flex items-center justify-center gap-2 bg-[hsl(var(--accent))] px-7 py-4 text-sm font-bold uppercase tracking-wider text-[hsl(var(--hero-bg))] hover:opacity-90"
                  >
                    Find services <ArrowRight className="h-4 w-4" />
                  </SmartLink>
                  <SmartLink
                    to="/tilbud"
                    className="inline-flex items-center justify-center border border-background/25 px-7 py-4 text-sm font-bold uppercase tracking-wider text-background hover:bg-background/5"
                  >
                    Indhent 3 tilbud
                  </SmartLink>
                </div>
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
