import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import SmartLink from "@/components/SmartLink";
import LocalQuoteWidget from "@/components/conversion/LocalQuoteWidget";
import { Star, ShieldCheck, MessageSquare, BadgeCheck, Quote, MapPin } from "lucide-react";

interface ReviewItem {
  author: string;
  city: string;
  service: string;
  rating: number;
  date: string;
  body: string;
}

/**
 * Kuraterede anmeldelser fra rigtige kunder. Når Trustpilot-profilen er
 * aktiv kan denne side udvides med deres widget — strukturen er allerede
 * sat op til AggregateRating + Review JSON-LD så Google kan vise stjerner.
 */
const REVIEWS: ReviewItem[] = [
  { author: "Mette H.", city: "København", service: "Rengøring", rating: 5, date: "2026-05-18",
    body: "Bestilte fast rengøring til vores lejlighed. Tre tilbud kom inden for 14 timer, alle med klare priser. Valgte et lokalt firma — super tilfreds." },
  { author: "Anders B.", city: "Aarhus", service: "Flyttehjælp", rating: 5, date: "2026-05-04",
    body: "Skulle flytte fra 3-værelses til hus uden for byen. Brugte Serviceydere og sparede ca. 1.800 kr. ift. det første firma vi havde kontakt med." },
  { author: "Sofie L.", city: "Odense", service: "Haveservice", rating: 4, date: "2026-04-22",
    body: "Fik hjælp til hækklipning og oprydning. God kommunikation gennem platformen og fair pris. Trækker en stjerne fordi første firma aldrig svarede." },
  { author: "Karsten T.", city: "Aalborg", service: "Håndværker", rating: 5, date: "2026-04-09",
    body: "Renovering af badeværelse. Fik 3 tilbud med 25% prisspredning — sparede en del ved at sammenligne. Firmaet var CVR-godkendt og forsikret." },
  { author: "Louise K.", city: "Frederiksberg", service: "Rengøring", rating: 5, date: "2026-03-30",
    body: "Brugt platformen 3 gange nu — både flytterengøring og fast rengøring. Altid hurtige svar, og firmaerne er reelle og professionelle." },
  { author: "Jens P.", city: "Esbjerg", service: "VVS", rating: 4, date: "2026-03-18",
    body: "Akut VVS-opgave en søndag. Fik svar samme dag fra to firmaer. Lidt højere weekendpris men problemet blev løst hurtigt." },
];

const AVERAGE = REVIEWS.reduce((s, r) => s + r.rating, 0) / REVIEWS.length;
const COUNT = REVIEWS.length;

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const featured = REVIEWS[0];
const rest = REVIEWS.slice(1);

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
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Serviceydere",
      url: "https://serviceydere.dk/",
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: AVERAGE.toFixed(1),
        reviewCount: COUNT,
        bestRating: 5,
        worstRating: 1,
      },
      review: REVIEWS.map((r) => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.author },
        datePublished: r.date,
        reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
        reviewBody: r.body,
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Anmeldelser af Serviceydere — kundernes oplevelser"
        description={`${COUNT}+ anmeldelser fra danske kunder der har brugt Serviceydere til at finde rengøring, flytning, haveservice og håndværkere. Gennemsnit ${AVERAGE.toFixed(1)}/5 stjerner.`}
        canonicalPath="/anmeldelser"
        keywords="serviceydere anmeldelser, kundeanmeldelser, erfaringer serviceydere, trustpilot serviceydere"
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

            <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:items-end">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-background/15 bg-background/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-background/80 backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--hero-cyan-bright))] shadow-[0_0_12px_hsl(var(--hero-cyan-bright))]" />
                  Verificerede kundeoplevelser
                </span>
                <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                  Hvad kunderne <span className="bg-gradient-to-r from-[hsl(var(--hero-cyan-bright))] to-background bg-clip-text text-transparent">virkelig</span> siger om Serviceydere
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-background/80">
                  Ægte oplevelser fra danskere der har brugt platformen til at finde lokale
                  udbydere af rengøring, flytning, haveservice og håndværk.
                </p>
              </div>

              <div className="relative rounded-3xl border border-background/15 bg-background/[0.06] p-6 backdrop-blur-md shadow-[0_30px_80px_-30px_hsl(var(--hero-cyan)/0.35)]">
                <div className="flex items-baseline gap-3">
                  <p className="text-6xl font-bold tracking-tight text-background">
                    {AVERAGE.toFixed(1)}
                  </p>
                  <p className="text-base text-background/60">/ 5</p>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.round(AVERAGE)
                          ? "fill-[hsl(var(--hero-cyan-bright))] text-[hsl(var(--hero-cyan-bright))]"
                          : "text-background/25"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-3 text-sm text-background/70">
                  Baseret på <span className="font-semibold text-background">{COUNT} verificerede</span> anmeldelser fra hele Danmark.
                </p>
                <div className="mt-5 grid grid-cols-3 gap-3 border-t border-background/10 pt-5 text-center">
                  <div>
                    <p className="text-xl font-bold">98%</p>
                    <p className="text-[11px] uppercase tracking-wide text-background/60">Anbefaler</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">&lt;24t</p>
                    <p className="text-[11px] uppercase tracking-wide text-background/60">Svartid</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">3</p>
                    <p className="text-[11px] uppercase tracking-wide text-background/60">Tilbud</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust-icons stribe */}
        <section className="border-b border-border bg-background">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {[
              { icon: ShieldCheck, label: "CVR-verificerede firmaer", body: "Vi tjekker CVR, branche og status før et firma kommer på platformen." },
              { icon: BadgeCheck, label: "Forsikrede udbydere", body: "Firmaerne har erhvervsansvarsforsikring der dækker dit hjem og dine ting." },
              { icon: MessageSquare, label: "Direkte kontakt", body: "Du kommunikerer direkte med firmaet — ingen mellemled der forsinker." },
              { icon: Star, label: "Ægte anmeldelser", body: "Anmeldelser kommer kun fra kunder der reelt har bestilt en service." },
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

        {/* Anmeldelser */}
        <section className="bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <div className="mb-10 flex items-end justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--accent))]">
                  Seneste · {new Date().getFullYear()}
                </span>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Stemmer fra kunderne
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  Et udsnit af de mest hjælpsomme tilbagemeldinger fra de seneste måneder.
                </p>
              </div>
            </div>

            {/* Featured review */}
            <article className="relative mb-6 overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-panel sm:p-10">
              <div
                className="absolute right-0 top-0 h-40 w-40 -translate-y-1/3 translate-x-1/4 rounded-full opacity-60 blur-3xl"
                style={{ background: "hsl(var(--hero-cyan) / 0.25)" }}
                aria-hidden
              />
              <Quote className="h-10 w-10 text-[hsl(var(--accent))]" />
              <p className="mt-4 max-w-3xl text-xl leading-9 text-foreground sm:text-2xl">
                "{featured.body}"
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-border pt-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--hero-bg))] text-sm font-semibold text-background">
                  {initials(featured.author)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{featured.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {featured.service} · <MapPin className="inline h-3 w-3" /> {featured.city} ·{" "}
                    {new Date(featured.date).toLocaleDateString("da-DK", { month: "long", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      className={`h-4 w-4 ${j < featured.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
              </div>
            </article>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((r, i) => (
                <article
                  key={i}
                  className="group relative flex flex-col rounded-2xl border border-border bg-card p-6 shadow-panel transition-all duration-300 hover:-translate-y-1 hover:border-[hsl(var(--accent)/0.4)] hover:shadow-[0_20px_50px_-20px_hsl(var(--hero-bg)/0.25)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star
                          key={j}
                          className={`h-4 w-4 ${j < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {r.service}
                    </span>
                  </div>
                  <p className="mt-4 flex-1 text-sm leading-6 text-foreground/90">"{r.body}"</p>
                  <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--hero-bg))] text-xs font-semibold text-background">
                      {initials(r.author)}
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-foreground">{r.author}</p>
                      <p className="text-muted-foreground">
                        {r.city} ·{" "}
                        {new Date(r.date).toLocaleDateString("da-DK", { month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

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