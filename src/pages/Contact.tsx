import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import SmartLink from "@/components/SmartLink";
import LocalQuoteWidget from "@/components/conversion/LocalQuoteWidget";
import { Mail, MapPin, Clock, HelpCircle, Building2, ArrowUpRight } from "lucide-react";

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
        {/* Hero — Ocean Deep */}
        <section
          className="relative isolate overflow-hidden text-background"
          style={{ backgroundColor: "hsl(var(--hero-bg))" }}
        >
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(80% 60% at 85% 0%, hsl(var(--hero-cyan) / 0.35), transparent 60%), linear-gradient(160deg, hsl(var(--hero-bg)) 0%, hsl(204 80% 8%) 100%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-[0.12]"
            style={{
              backgroundImage: "radial-gradient(hsl(var(--hero-cyan-bright)) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10 lg:px-8">
            <nav aria-label="Brødkrumme" className="text-[13px] font-medium text-background/65">
              <SmartLink to="/" className="transition hover:text-background">Forside</SmartLink>
              <span className="mx-2 text-background/35">/</span>
              <span className="text-background">Kontakt</span>
            </nav>
            <div className="mt-6 grid gap-10 lg:grid-cols-[1.4fr,1fr] lg:items-end">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-background/25 bg-background/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-background/85 backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "hsl(var(--hero-cyan-bright))" }} />
                  Support · partnerskaber · presse
                </span>
                <h1 className="mt-4 text-[2rem] font-semibold leading-[1.05] tracking-[-0.025em] sm:text-[2.6rem] lg:text-[3rem]">
                  Lad os tale sammen.
                </h1>
                <p className="mt-5 max-w-xl text-[15px] leading-7 text-background/80 sm:text-[17px] sm:leading-[1.6]">
                  Vi svarer typisk inden for 24 timer på hverdage. Skriv direkte — eller brug
                  widgeten nedenfor hvis du leder efter en konkret udbyder.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="mailto:kontakt@serviceydere.dk"
                    className="inline-flex h-11 items-center gap-2 rounded-md bg-background px-5 text-sm font-semibold text-foreground transition hover:opacity-90"
                  >
                    <Mail className="h-4 w-4" /> kontakt@serviceydere.dk
                  </a>
                  <SmartLink
                    to="/hjaelp"
                    className="inline-flex h-11 items-center gap-2 rounded-md border border-background/30 bg-background/5 px-5 text-sm font-semibold text-background transition hover:bg-background/10"
                  >
                    Hjælpecenter <ArrowUpRight className="h-4 w-4" />
                  </SmartLink>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-background">
                {[
                  { k: "< 24t", v: "Svartid hverdage" },
                  { k: "9–17", v: "Mandag–fredag" },
                  { k: "DK", v: "Hele landet" },
                  { k: "GDPR", v: "EU-hosting" },
                ].map((s) => (
                  <div
                    key={s.k}
                    className="rounded-2xl border border-background/15 bg-background/10 p-4 backdrop-blur-md"
                  >
                    <div className="text-2xl font-semibold tracking-tight">{s.k}</div>
                    <div className="mt-1 text-xs text-background/70">{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Kontakt-kort */}
        <section>
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-end justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Skriv direkte</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Hvem vil du i kontakt med?</h2>
              </div>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
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
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-lg"
              >
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-px"
                  style={{ background: "linear-gradient(90deg, transparent, hsl(var(--hero-cyan-bright) / 0.6), transparent)" }}
                />
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-background ring-1 ring-foreground/10">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
                {lines.map((l, i) => (
                  <p key={i} className={i === 0 ? "mt-1 text-sm font-medium text-foreground group-hover:underline" : "mt-1 text-sm text-muted-foreground"}>{l}</p>
                ))}
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/70">
                  Skriv nu <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </a>
            ))}
            </div>
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

        {/* Hjælpe-FAQ shortcut — Ocean Deep band */}
        <section className="px-4 pb-16 sm:px-6 lg:px-8">
          <div
            className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl text-background"
            style={{
              background:
                "radial-gradient(70% 120% at 100% 0%, hsl(var(--hero-cyan) / 0.45), transparent 60%), linear-gradient(135deg, hsl(var(--hero-bg)) 0%, hsl(204 80% 10%) 100%)",
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.1]"
              style={{
                backgroundImage: "radial-gradient(hsl(var(--hero-cyan-bright)) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            />
            <div className="relative grid gap-6 p-8 sm:p-12 lg:grid-cols-[1.6fr,1fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-background/70">Selvbetjening</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Find svar på almindelige spørgsmål
                </h2>
                <p className="mt-3 max-w-xl text-[15px] leading-7 text-background/80">
                  De fleste spørgsmål er allerede besvaret i hjælpecentret — det er hurtigere end at
                  vente på et svar fra os.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <SmartLink
                  to="/hjaelp"
                  className="inline-flex h-11 items-center rounded-md bg-background px-5 text-sm font-semibold text-foreground hover:opacity-90"
                >
                  Gå til hjælpecenter
                </SmartLink>
                <SmartLink
                  to="/anmeldelser"
                  className="inline-flex h-11 items-center rounded-md border border-background/30 bg-background/5 px-5 text-sm font-semibold text-background hover:bg-background/10"
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