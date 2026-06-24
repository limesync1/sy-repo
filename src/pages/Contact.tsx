import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import SmartLink from "@/components/SmartLink";
import LocalQuoteWidget from "@/components/conversion/LocalQuoteWidget";
import { Mail, MapPin, Clock, HelpCircle, Building2 } from "lucide-react";

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
        description="Kontakt Serviceydere via email kontakt@serviceydere.dk. Vi hjælper kunder, udbydere og pressekontakter — typisk svar inden for 24 timer på hverdage."
        canonicalPath="/kontakt"
        keywords="kontakt serviceydere, serviceydere support, kontakt platform, serviceydere email"
        jsonLd={jsonLd}
      />
      <SiteNav />

      <main id="main">
        {/* Hero */}
        <section className="bg-foreground text-background">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <nav aria-label="Brødkrumme" className="mb-6 text-sm text-background/60">
              <SmartLink to="/" className="hover:text-background">Forside</SmartLink>
              <span className="mx-2">/</span>
              <span className="text-background">Kontakt</span>
            </nav>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Kontakt Serviceydere</h1>
            <p className="mt-6 max-w-2xl text-lg leading-7 text-background/80">
              Vi svarer typisk inden for 24 timer på hverdage. Skriv direkte til os — eller brug
              widgeten nedenfor hvis du leder efter en konkret udbyder.
            </p>
          </div>
        </section>

        {/* Kontakt-kort */}
        <section>
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-3 lg:px-8">
            {[
              {
                icon: Mail,
                title: "Generel kontakt",
                lines: ["kontakt@serviceydere.dk", "Spørgsmål, support og tilbud"],
                href: "mailto:kontakt@serviceydere.dk",
              },
              {
                icon: Building2,
                title: "For udbydere",
                lines: ["kontakt@serviceydere.dk", "Onboarding, fakturering og samarbejde"],
                href: "mailto:kontakt@serviceydere.dk?subject=Udbyder",
              },
              {
                icon: HelpCircle,
                title: "Presse & PR",
                lines: ["kontakt@serviceydere.dk", "Citater, interviews og partnerskaber"],
                href: "mailto:kontakt@serviceydere.dk?subject=Presse",
              },
            ].map(({ icon: Icon, title, lines, href }) => (
              <a
                key={title}
                href={href}
                className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-panel transition hover:border-foreground/40"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-foreground/10">
                  <Icon className="h-5 w-5 text-foreground" />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
                {lines.map((l, i) => (
                  <p key={i} className={i === 0 ? "mt-1 text-sm font-medium text-foreground group-hover:underline" : "mt-1 text-sm text-muted-foreground"}>{l}</p>
                ))}
              </a>
            ))}
          </div>
        </section>

        {/* NAP + åbningstider */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Firmaoplysninger</h2>
              <dl className="mt-6 space-y-4 text-sm text-foreground">
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-foreground/70" />
                  <div>
                    <dt className="font-semibold">Adresse</dt>
                    <dd className="text-muted-foreground">Danmark — vi dækker hele landet digitalt.</dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-foreground/70" />
                  <div>
                    <dt className="font-semibold">Email</dt>
                    <dd>
                      <a href="mailto:kontakt@serviceydere.dk" className="text-foreground hover:underline">
                        kontakt@serviceydere.dk
                      </a>
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-foreground/70" />
                  <div>
                    <dt className="font-semibold">Svartid</dt>
                    <dd className="text-muted-foreground">Hverdage 9–17 · Typisk svar inden for 24 timer.</dd>
                  </div>
                </div>
              </dl>
            </div>

            <LocalQuoteWidget
              heading="Leder du efter en konkret udbyder?"
              description="Skriv ikke til os — start tilbudsflowet og få direkte kontakt med 3 lokale firmaer."
            />
          </div>
        </section>

        {/* Hjælpe-FAQ shortcut */}
        <section>
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-foreground">Find svar på almindelige spørgsmål</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                De fleste spørgsmål er allerede besvaret i hjælpecentret — det er hurtigere end at
                vente på et svar fra os.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <SmartLink
                  to="/hjaelp"
                  className="inline-flex h-11 items-center rounded-md bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90"
                >
                  Gå til hjælpecenter
                </SmartLink>
                <SmartLink
                  to="/anmeldelser"
                  className="inline-flex h-11 items-center rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted"
                >
                  Se anmeldelser
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

export default Contact;