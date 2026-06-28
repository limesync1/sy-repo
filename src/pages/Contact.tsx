import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import SmartLink from "@/components/SmartLink";
import LocalQuoteWidget from "@/components/conversion/LocalQuoteWidget";
import PageHero from "@/components/landing/PageHero";
import { Mail, MapPin, Clock, HelpCircle, Building2, ArrowUpRight, ArrowRight, ShieldCheck, MessageSquare, Sparkles } from "lucide-react";

const CONTACT_CARDS = [
  {
    icon: Mail,
    eyebrow: "Support",
    title: "Generel kontakt",
    desc: "Spørgsmål, support og hjælp til at finde den rette serviceyder.",
    email: "kontakt@serviceydere.dk",
    href: "mailto:kontakt@serviceydere.dk",
    tone: "bg-feature-cool text-feature-cool-foreground",
  },
  {
    icon: Building2,
    eyebrow: "Udbydere",
    title: "For virksomheder",
    desc: "Onboarding, fakturering, profil og samarbejde om leads.",
    email: "kontakt@serviceydere.dk",
    href: "mailto:kontakt@serviceydere.dk?subject=Udbyder",
    tone: "bg-feature-warm text-feature-warm-foreground",
  },
  {
    icon: HelpCircle,
    eyebrow: "Presse & PR",
    title: "Presse og partnerskaber",
    desc: "Citater, interviews, data og samarbejder med medier.",
    email: "kontakt@serviceydere.dk",
    href: "mailto:kontakt@serviceydere.dk?subject=Presse",
    tone: "bg-feature-lilac text-feature-lilac-foreground",
  },
] as const;

const PROMISES = [
  { Icon: Clock, k: "< 24t", t: "Svartid på hverdage" },
  { Icon: MapPin, k: "Hele DK", t: "Vi dækker alle byer" },
  { Icon: ShieldCheck, k: "GDPR", t: "EU-hosting & sikkerhed" },
  { Icon: MessageSquare, k: "Dansk", t: "Support på dit sprog" },
];

const Contact = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Serviceydere",
      url: "https://serviceydere.dk/",
      logo: "https://serviceydere.dk/serviceydere-logo-dark.webp",
      email: "kontakt@serviceydere.dk",
      areaServed: { "@type": "Country", name: "Danmark" },
      contactPoint: [
        {
          "@type": "ContactPoint",
          email: "kontakt@serviceydere.dk",
          contactType: "customer support",
          availableLanguage: ["Danish"],
          areaServed: "DK",
        },
        {
          "@type": "ContactPoint",
          email: "kontakt@serviceydere.dk",
          contactType: "sales",
          availableLanguage: ["Danish"],
          areaServed: "DK",
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: "https://serviceydere.dk/" },
        { "@type": "ListItem", position: 2, name: "Kontakt", item: "https://serviceydere.dk/kontakt" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "Kontakt Serviceydere",
      url: "https://serviceydere.dk/kontakt",
      inLanguage: "da-DK",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Kontakt Serviceydere — support, samarbejde og spørgsmål"
        description="Kontakt Serviceydere via email kontakt@serviceydere.dk. Vi hjælper kunder, udbydere og pressekontakter — vi besvarer henvendelser løbende på hverdage."
        canonicalPath="/kontakt"
        keywords="kontakt serviceydere, serviceydere support, kontakt platform, serviceydere email"
        jsonLd={jsonLd}
      />
      <SiteNav />

      <main id="main">
        <PageHero
          eyebrow="Kontakt Serviceydere"
          title={<>Lad os <span className="text-accent">tale sammen</span></>}
          subtitle="Vi besvarer henvendelser løbende på hverdage. Skriv direkte til det rette team — eller start tilbudsflowet hvis du leder efter en konkret udbyder."
          actions={
            <>
              <a
                href="mailto:kontakt@serviceydere.dk"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
              >
                <Mail className="h-4 w-4" /> kontakt@serviceydere.dk
              </a>
              <SmartLink
                to="/hjaelp"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-background/25 bg-background/5 px-5 py-2.5 text-sm font-semibold text-background backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-background/10"
              >
                Hjælpecenter <ArrowUpRight className="h-4 w-4" />
              </SmartLink>
            </>
          }
        />

        {/* PROMISES STRIP */}
        <section className="bg-background pb-8 pt-12 md:pb-12 md:pt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-card px-6 py-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:px-12 md:py-11">
              <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/[0.06] blur-3xl" />
              <dl className="relative grid grid-cols-2 gap-y-8 md:grid-cols-4 md:gap-2">
                {PROMISES.map((s, i) => (
                  <div
                    key={s.k}
                    className={`text-center md:text-left ${i > 0 ? "md:border-l md:border-border/60 md:pl-10" : ""}`}
                  >
                    <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background md:ml-0">
                      <s.Icon className="h-4 w-4" />
                    </div>
                    <dd className="text-[1.5rem] font-semibold leading-none tracking-[-0.02em] text-foreground md:text-[1.75rem]">
                      {s.k}
                    </dd>
                    <dt className="mt-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      {s.t}
                    </dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* CONTACT CARDS */}
        <section className="bg-secondary py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 max-w-2xl">
              <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <span className="h-px w-6 bg-foreground/30" />
                Skriv direkte
              </span>
              <h2 className="mt-5 text-[2rem] font-semibold leading-[1.04] tracking-[-0.025em] text-foreground md:text-[2.75rem] lg:text-[3.25rem]">
                Hvem vil du i kontakt med?
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
                Vælg det team der passer bedst — så når din mail hurtigere frem til den rette person.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {CONTACT_CARDS.map(({ icon: Icon, eyebrow, title, desc, email, href, tone }) => (
                <a
                  key={title}
                  href={href}
                  className="group relative flex flex-col overflow-hidden rounded-[24px] border border-border/70 bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div aria-hidden className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full ${tone} opacity-50 blur-2xl`} />
                  <div className="relative">
                    <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</span>
                    <h3 className="mt-2 text-[18px] font-semibold tracking-tight text-foreground">{title}</h3>
                    <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">{desc}</p>
                    <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
                      <span className="text-[13px] font-medium text-foreground group-hover:underline">{email}</span>
                      <ArrowUpRight className="h-4 w-4 text-foreground/60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* INFO + QUOTE WIDGET */}
        <section className="bg-background py-20 md:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.4fr] lg:gap-16 lg:px-8">
            <div>
              <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <span className="h-px w-6 bg-foreground/30" />
                Firmaoplysninger
              </span>
              <h2 className="mt-5 text-[2rem] font-semibold leading-[1.04] tracking-[-0.025em] text-foreground md:text-[2.5rem]">
                Sådan får du fat i os
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
                Vi er en dansk platform — du får svar fra rigtige mennesker på dansk.
              </p>
              <dl className="mt-8 space-y-4">
                {[
                  { Icon: MapPin, t: "Adresse", b: "Danmark — vi dækker hele landet digitalt." },
                  { Icon: Mail, t: "Email", b: "kontakt@serviceydere.dk", isMail: true },
                  { Icon: Clock, t: "Svartid", b: "Hverdage 9–17 · vi vender retur så hurtigt vi kan." },
                ].map(({ Icon, t, b, isMail }) => (
                  <div key={t} className="flex gap-4 rounded-[20px] border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <dt className="text-[13px] font-semibold text-foreground">{t}</dt>
                      <dd className="mt-0.5 text-[13.5px] leading-6 text-muted-foreground">
                        {isMail ? (
                          <a href="mailto:kontakt@serviceydere.dk" className="text-foreground hover:underline">{b}</a>
                        ) : b}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <LocalQuoteWidget
                heading="Leder du efter en konkret udbyder?"
                description="Skriv ikke til os — start tilbudsflowet og få direkte kontakt med op til 3 lokale firmaer."
              />
            </div>
          </div>
        </section>

        {/* HELP SHORTCUT */}
        <section className="bg-secondary pb-20 pt-4 md:pb-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-card p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:p-12">
              <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/[0.08] blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-feature-lilac/40 blur-3xl" />
              <div className="relative grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-center">
                <div>
                  <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" />
                    Selvbetjening
                  </span>
                  <h2 className="mt-4 text-[1.75rem] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground md:text-[2.25rem]">
                    Find svar på almindelige spørgsmål
                  </h2>
                  <p className="mt-3 max-w-xl text-[15px] leading-7 text-muted-foreground">
                    De fleste spørgsmål er allerede besvaret i hjælpecentret — det er hurtigere end at vente på et svar fra os.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 lg:justify-end">
                  <SmartLink
                    to="/hjaelp"
                    className="group inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-all hover:-translate-y-0.5"
                  >
                    Gå til hjælpecenter
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </SmartLink>
                  <SmartLink
                    to="/anmeldelser"
                    className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
                  >
                    Se anmeldelser
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

export default Contact;