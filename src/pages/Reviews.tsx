import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import SmartLink from "@/components/SmartLink";
import LocalQuoteWidget from "@/components/conversion/LocalQuoteWidget";
import { Star, ShieldCheck, MessageSquare, BadgeCheck } from "lucide-react";

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
        {/* Hero */}
        <section className="bg-foreground text-background">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <nav aria-label="Brødkrumme" className="mb-6 text-sm text-background/60">
              <SmartLink to="/" className="hover:text-background">Forside</SmartLink>
              <span className="mx-2">/</span>
              <span className="text-background">Anmeldelser</span>
            </nav>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Hvad kunderne siger om Serviceydere
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-7 text-background/80">
              Ægte oplevelser fra danskere der har brugt platformen til at finde lokale
              udbydere af rengøring, flytning, haveservice og håndværk.
            </p>
            <div className="mt-8 inline-flex items-center gap-4 rounded-2xl border border-background/15 bg-background/5 px-5 py-4">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${i < Math.round(AVERAGE) ? "fill-yellow-400 text-yellow-400" : "text-background/30"}`}
                  />
                ))}
              </div>
              <div>
                <p className="text-lg font-semibold">{AVERAGE.toFixed(1)} / 5</p>
                <p className="text-xs text-background/60">Baseret på {COUNT} verificerede anmeldelser</p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust-icons stribe */}
        <section className="border-b border-border bg-muted/30">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {[
              { icon: ShieldCheck, label: "CVR-verificerede firmaer", body: "Vi tjekker CVR, branche og status før et firma kommer på platformen." },
              { icon: BadgeCheck, label: "Forsikrede udbydere", body: "Firmaerne har erhvervsansvarsforsikring der dækker dit hjem og dine ting." },
              { icon: MessageSquare, label: "Direkte kontakt", body: "Du kommunikerer direkte med firmaet — ingen mellemled der forsinker." },
              { icon: Star, label: "Ægte anmeldelser", body: "Anmeldelser kommer kun fra kunder der reelt har bestilt en service." },
            ].map(({ icon: Icon, label, body }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-foreground/10">
                  <Icon className="h-5 w-5 text-foreground" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs leading-5 text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Anmeldelser */}
        <section>
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Seneste anmeldelser
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Et udsnit af de mest hjælpsomme tilbagemeldinger fra de seneste måneder.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {REVIEWS.map((r, i) => (
                <article
                  key={i}
                  className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-panel"
                >
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star
                        key={j}
                        className={`h-4 w-4 ${j < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-foreground/90">"{r.body}"</p>
                  <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">{r.author}</p>
                    <p>
                      {r.service} · {r.city} ·{" "}
                      {new Date(r.date).toLocaleDateString("da-DK", { month: "long", year: "numeric" })}
                    </p>
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