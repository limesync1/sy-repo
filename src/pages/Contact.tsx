import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import SmartLink from "@/components/SmartLink";
import LocalQuoteWidget from "@/components/conversion/LocalQuoteWidget";
import PageHero from "@/components/landing/PageHero";
import { Mail, MapPin, Clock, ArrowUpRight, ArrowRight, Sparkles } from "lucide-react";

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
          title={<>Lad os <span className="hero-accent-text">tale sammen</span></>}
          subtitle="Skriv til os på kontakt@serviceydere.dk — vi besvarer henvendelser løbende på hverdage. Søger du en konkret udbyder, er det hurtigere at starte tilbudsflowet."
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

        {/* INFO — simpel kontakt-info som en klassisk firma-kontaktside */}
        <section className="bg-background py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  Icon: Mail,
                  label: "Email",
                  value: "kontakt@serviceydere.dk",
                  sub: "Vi svarer typisk inden for 1–2 hverdage.",
                  href: "mailto:kontakt@serviceydere.dk",
                },
                {
                  Icon: Clock,
                  label: "Åbningstider",
                  value: "Hverdage 9–17",
                  sub: "Lukket weekender og helligdage.",
                },
                {
                  Icon: MapPin,
                  label: "Område",
                  value: "Hele Danmark",
                  sub: "Vi formidler udbydere i alle regioner.",
                },
              ].map(({ Icon, label, value, sub, href }) => (
                <div
                  key={label}
                  className="flex flex-col rounded-[24px] border border-border/70 bg-card p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-background">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {label}
                  </span>
                  <div className="mt-1 text-[17px] font-semibold tracking-tight text-foreground">
                    {href ? (
                      <a href={href} className="hover:underline">{value}</a>
                    ) : value}
                  </div>
                  <p className="mt-2 text-[13.5px] leading-6 text-muted-foreground">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* QUOTE WIDGET — fuld bredde, så den ikke ser presset ud */}
        <section className="bg-secondary py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <span className="h-px w-6 bg-foreground/30" />
                Søger du en udbyder?
              </span>
              <h2 className="mt-5 text-[2rem] font-semibold leading-[1.04] tracking-[-0.025em] text-foreground md:text-[2.5rem]">
                Få 3 tilbud i stedet
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
                Skal du bruge rengøring, håndværker, flyttehjælp eller noget helt fjerde — start tilbudsflowet og få direkte kontakt med op til 3 lokale firmaer.
              </p>
            </div>
            <LocalQuoteWidget
              heading="Beskriv opgaven — modtag op til 3 tilbud"
              description="Vælg service og by, så sender vi dig direkte ind i tilbudsflowet."
            />
          </div>
        </section>

        {/* HELP SHORTCUT */}
        <section className="bg-background pb-20 pt-4 md:pb-28">
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