import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import SmartLink from "@/components/SmartLink";
import LocalQuoteWidget from "@/components/conversion/LocalQuoteWidget";
import PageHero from "@/components/landing/PageHero";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import iconEmail from "@/assets/content-icons/email.svg.asset.json";
import iconSvartid from "@/assets/content-icons/svartid.svg.asset.json";
import iconAdresse from "@/assets/content-icons/omraade.svg.asset.json";
import iconCvr from "@/assets/content-icons/cvr-tjekket.svg.asset.json";
import iconSupport from "@/assets/content-icons/et-menneske-naar-du-har-brug-for-det.svg.asset.json";
import { OFFICIAL_PROFILE_URLS } from "@/lib/social-links";

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
      sameAs: OFFICIAL_PROFILE_URLS,
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
                <img src={iconEmail.url} alt="" className="h-6 w-6 object-contain" /> <span className="[overflow-wrap:anywhere]">kontakt@serviceydere.dk</span>
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
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
              {[
                { icon: iconEmail.url, label: "E-mail", value: "kontakt@serviceydere.dk", sub: "Vi svarer typisk inden for 1–2 hverdage.", href: "mailto:kontakt@serviceydere.dk" },
                { icon: iconSvartid.url, label: "Åbningstider", value: "Hverdage 9–17", sub: "Lukket weekender og helligdage." },
                { icon: iconAdresse.url, label: "Adresse", value: "Vistorpvej 30", sub: "7540 Haderup, Midtjylland", href: "https://www.google.com/maps/search/?api=1&query=Vistorpvej+30%2C+7540+Haderup" },
                { icon: iconCvr.url, label: "CVR", value: "40543120", sub: "Stiftet 2026", href: "https://datacvr.virk.dk/enhed/virksomhed/40543120" },
              ].map(({ icon, label, value, sub, href }) => (
                <div key={label} className="flex min-w-0 items-start gap-4 rounded-[20px] border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background p-1.5">
                    <img src={icon} alt="" className="h-full w-full object-contain" loading="lazy" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
                    <div className="mt-0.5 text-base font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">
                      {href ? (
                        <a href={href} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline" {...(href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}>{value}</a>
                      ) : <span className="inline-flex min-h-11 items-center">{value}</span>}
                    </div>
                    <p className="text-sm leading-5 text-muted-foreground">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* QUOTE WIDGET — fuld bredde, så den ikke ser presset ud */}
        <section className="bg-secondary py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <h2 className="text-[2rem] font-semibold leading-[1.04] tracking-[-0.025em] text-foreground md:text-[2.5rem]">
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
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background p-1.5">
                    <img src={iconSupport.url} alt="" className="h-full w-full object-contain" loading="lazy" />
                  </div>
                  <div className="min-w-0">
                  <h2 className="text-[1.75rem] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground md:text-[2.25rem]">
                    Find svar på almindelige spørgsmål
                  </h2>
                  <p className="mt-3 max-w-xl text-[15px] leading-7 text-muted-foreground">
                    De fleste spørgsmål er allerede besvaret i hjælpecentret — det er hurtigere end at vente på et svar fra os.
                  </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 lg:justify-end">
                  <SmartLink
                    to="/hjaelp"
                    className="group inline-flex items-center gap-2 min-h-11 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-all hover:-translate-y-0.5"
                  >
                    Gå til hjælpecenter
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </SmartLink>
                  <SmartLink
                    to="/anmeldelser"
                    className="inline-flex items-center gap-2 min-h-11 rounded-full border border-border/70 bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
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