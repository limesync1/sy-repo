import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import SmartLink from "@/components/SmartLink";
import PageHero from "@/components/landing/PageHero";
import { IndustryIcon } from "@/components/IndustryIcon";
import { topCategories } from "@/lib/service-taxonomy";
import { Shield, Users, MapPin, Mail, CheckCircle2, Building2, HeartHandshake, ArrowRight, Sparkles, Lock, Search } from "lucide-react";

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

const CITY_PILLS = [
  "København", "Aarhus", "Odense", "Aalborg", "Esbjerg", "Randers",
  "Kolding", "Horsens", "Vejle", "Roskilde", "Herning", "Helsingør",
  "Silkeborg", "Næstved", "Frederiksberg", "Holstebro",
];

const CATEGORY_TONES = [
  "bg-feature-cool text-feature-cool-foreground",
  "bg-feature-warm text-feature-warm-foreground",
  "bg-feature-lilac text-feature-lilac-foreground",
  "bg-accent-soft text-accent",
] as const;

const FEATURED_CATEGORIES = topCategories().slice(0, 10);

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
        <PageHero
          eyebrow="Om Serviceydere"
          title={<>Vi gør det enklere at finde <span className="text-accent">den rette serviceyder</span> i Danmark</>}
          subtitle="Serviceydere forbinder private og virksomheder med verificerede lokale udbydere af rengøring, håndværk, flyttehjælp, haveservice og meget mere — i hele Danmark."
          actions={
            <>
              <SmartLink
                to="/virksomheder"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
              >
                Find services <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </SmartLink>
              <SmartLink
                to="/tilbud"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-background/25 bg-background/5 px-5 py-2.5 text-sm font-semibold text-background backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-background/10"
              >
                Indhent 3 tilbud
              </SmartLink>
            </>
          }
        />

        {/* STATS */}
        <section className="bg-background pb-8 pt-12 md:pb-12 md:pt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-card px-6 py-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:px-12 md:py-11">
              <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/[0.06] blur-3xl" />
              <dl className="relative grid grid-cols-2 gap-y-8 md:grid-cols-4 md:gap-2">
                {STATS.map((s, i) => (
                  <div
                    key={s.label}
                    className={`text-center md:text-left ${i > 0 ? "md:border-l md:border-border/60 md:pl-10" : ""}`}
                  >
                    <dd className="text-[2.25rem] font-semibold leading-none tracking-[-0.02em] text-foreground tabular-nums md:text-[2.75rem]">
                      {s.value}
                    </dd>
                    <dt className="mt-3 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      {s.label}
                    </dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* MISSION */}
        <section className="bg-secondary py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.4fr] lg:gap-20">
              <div>
                <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  <span className="h-px w-6 bg-foreground/30" />
                  Mission
                </span>
                <h2 className="mt-5 text-[2rem] font-semibold leading-[1.04] tracking-[-0.025em] text-foreground md:text-[2.75rem] lg:text-[3.25rem]">
                  Tryghed, gennemsigtighed og lokal kvalitet
                </h2>
              </div>
              <div className="space-y-5 text-[15px] leading-7 text-muted-foreground md:text-base">
                <p>
                  Hver dag bruger danskere timer på at finde, sammenligne og kontakte
                  serviceydere — uden at vide om udbyderen er pålidelig, om prisen er fair,
                  eller om kvaliteten holder. Det ville vi lave om på.
                </p>
                <p>
                  Serviceydere samler verificerede danske virksomheder ét sted, så du på få
                  minutter kan finde en lokal udbyder, sammenligne tilbud og booke med tryghed.
                  Vi tjekker CVR og kontaktoplysninger — og for de udbydere der har det,
                  også forsikring og certificeringer.
                </p>
                <p className="rounded-2xl border border-border/70 bg-card px-5 py-4 text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  Det er <strong>gratis for private</strong> at bruge platformen. Vi tjener
                  vores penge ved at hjælpe seriøse virksomheder med at vækste.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PRINCIPLES */}
        <section className="bg-background py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 max-w-2xl">
              <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <span className="h-px w-6 bg-foreground/30" />
                Principper
              </span>
              <h2 className="mt-5 text-[2rem] font-semibold leading-[1.04] tracking-[-0.025em] text-foreground md:text-[2.75rem] lg:text-[3.25rem]">
                Sådan arbejder vi
              </h2>
              <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground md:text-base">
                Fire principper der gælder for hver udbyder og hver forespørgsel på platformen.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PRINCIPLES.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="group flex flex-col rounded-[24px] border border-border/70 bg-card p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-border"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-background">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 text-[15px] font-semibold leading-tight tracking-tight text-foreground">{title}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="bg-secondary py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.4fr] lg:gap-20">
              <div>
                <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  <span className="h-px w-6 bg-foreground/30" />
                  Kontakt
                </span>
                <h2 className="mt-5 text-[1.75rem] font-semibold leading-[1.05] tracking-[-0.025em] text-foreground md:text-[2.25rem]">
                  Kontakt &amp; virksomhedsinfo
                </h2>
                <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
                  Vi besvarer henvendelser løbende på hverdage.
                </p>
              </div>
              <dl className="grid gap-4 sm:grid-cols-3">
                {[
                  { Icon: Building2, label: "Platform", value: "Serviceydere", sub: "Markedsplads for service & håndværk" },
                  { Icon: MapPin, label: "Område", value: "Hele Danmark", sub: "Alle regioner og 50+ byer" },
                  { Icon: Mail, label: "E-mail", value: "kontakt@serviceydere.dk", sub: "Svar inden for få hverdage", href: "mailto:kontakt@serviceydere.dk" },
                ].map(({ Icon, label, value, sub, href }) => (
                  <div key={label} className="rounded-[20px] border border-border/70 bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                      <Icon className="h-5 w-5" />
                    </div>
                    <dt className="mt-4 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">{label}</dt>
                    <dd className="mt-1 text-[15px] font-semibold text-foreground">
                      {href ? <a href={href} className="underline-offset-4 hover:underline">{value}</a> : value}
                    </dd>
                    <dd className="text-[13px] leading-5 text-muted-foreground">{sub}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-background py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div
              className="relative isolate overflow-hidden rounded-[28px] px-8 py-12 text-background sm:px-12 sm:py-16"
              style={{ backgroundColor: "hsl(var(--hero-bg))" }}
            >
              <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full blur-[100px] opacity-30" style={{ backgroundColor: "hsl(var(--hero-mid))" }} />
                <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full blur-[90px] opacity-20" style={{ backgroundColor: "hsl(var(--hero-cyan))" }} />
              </div>
              <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
                <div className="max-w-xl">
                  <h2 className="text-[1.75rem] font-semibold leading-[1.05] tracking-[-0.025em] sm:text-[2.25rem]">
                    Klar til at finde den rette serviceyder?
                  </h2>
                  <p className="mt-3 text-[15px] leading-7 text-background/80">
                    Søg direkte — eller få op til 3 gratis tilbud fra verificerede udbydere i dit område.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <SmartLink
                    to="/virksomheder"
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
                  >
                    Find services <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </SmartLink>
                  <SmartLink
                    to="/tilbud"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-background/25 bg-background/5 px-5 py-2.5 text-sm font-semibold text-background backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-background/10"
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
