import SEO from "@/components/SEO";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import SmartLink from "@/components/SmartLink";
import PageHero from "@/components/landing/PageHero";
import LocalQuoteWidget from "@/components/conversion/LocalQuoteWidget";
import { IndustryIcon } from "@/components/IndustryIcon";
import { ShieldCheck, MessageSquare, BadgeCheck, Star, Mail, ArrowRight, Quote, Sparkles } from "lucide-react";

const PREVIEW_REVIEWS = [
  { category: "Rengøring", city: "Aarhus", initials: "—", placeholder: true },
  { category: "Tømrer", city: "København", initials: "—", placeholder: true },
  { category: "Haveservice", city: "Odense", initials: "—", placeholder: true },
];

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
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Anmeldelser af Serviceydere — sådan sikrer vi kvalitet"
        description="Anmeldelser og kundeoplevelser på Serviceydere er på vej. Læs hvordan vi verificerer udbydere via CVR, og hvordan anmeldelser kommer til at fungere på platformen."
        canonicalPath="/anmeldelser"
        keywords="serviceydere anmeldelser, kundeanmeldelser, erfaringer serviceydere, kvalitetssikring"
        jsonLd={jsonLd}
      />
      <SiteNav />

      <main id="main">
        <PageHero
          eyebrow="Kvalitet & tryghed"
          title={<>Anmeldelser fra <span className="hero-accent-text">rigtige kunder</span> — på vej</>}
          subtitle="Serviceydere er en ny dansk platform. Vi viser kun anmeldelser, der kommer fra reelle kunder med en gennemført opgave — derfor er der endnu ikke offentlige anmeldelser at vise her. I mellemtiden kan du læse om, hvordan vi verificerer hver enkelt udbyder."
          actions={
            <>
              <SmartLink
                to="/tilbud"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
              >
                Indhent 3 tilbud <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </SmartLink>
              <a
                href="mailto:kontakt@serviceydere.dk?subject=Min%20oplevelse%20med%20Serviceydere"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-background/25 bg-background/5 px-5 py-2.5 text-sm font-semibold text-background backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-background/10"
              >
                <Mail className="h-4 w-4" /> Del din oplevelse
              </a>
            </>
          }
        />

        {/* PREVIEW — sådan vil anmeldelser se ud */}
        <section className="bg-background pt-16 md:pt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-3">
              <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <span className="h-px w-6 bg-foreground/30" />
                Forhåndsvisning
              </span>
              <h2 className="text-[1.75rem] font-semibold leading-[1.05] tracking-[-0.025em] text-foreground md:text-[2.25rem]">
                Sådan vil anmeldelser se ud
              </h2>
              <p className="max-w-xl text-[15px] leading-7 text-muted-foreground">
                Et eksempel på formatet — placeholders indtil de første verificerede anmeldelser kommer ind.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {PREVIEW_REVIEWS.map((r, i) => (
                <div
                  key={i}
                  className="relative flex flex-col rounded-[24px] border border-dashed border-border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                >
                  <span className="absolute right-5 top-5 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Eksempel
                  </span>
                  <Quote className="h-6 w-6 text-muted-foreground/40" aria-hidden />
                  <div className="mt-3 space-y-1.5">
                    <div className="h-2.5 w-11/12 rounded-full bg-secondary" />
                    <div className="h-2.5 w-10/12 rounded-full bg-secondary" />
                    <div className="h-2.5 w-7/12 rounded-full bg-secondary" />
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-muted-foreground/40">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="h-4 w-4" />
                    ))}
                  </div>
                  <div className="mt-6 flex items-center gap-3 border-t border-border/60 pt-4">
                    <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-secondary ring-1 ring-border">
                      <IndustryIcon category={r.category} className="h-6 w-6" alt={r.category} />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-foreground">{r.category}</div>
                      <div className="text-[12px] text-muted-foreground">{r.city}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROMISE BAND */}
        <section className="bg-background pt-12 md:pt-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-card px-6 py-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] md:px-12 md:py-10">
              <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/[0.06] blur-3xl" />
              <div className="relative grid gap-8 md:grid-cols-3">
                {[
                  { value: "100%", label: "Knyttet til gennemførte opgaver" },
                  { value: "0", label: "Opdigtede eller købte anmeldelser" },
                  { value: "CVR", label: "Verificering på hvert firma" },
                ].map((s, i) => (
                  <div key={s.label} className={`text-center md:text-left ${i > 0 ? "md:border-l md:border-border/60 md:pl-10" : ""}`}>
                    <div className="text-[2rem] font-semibold leading-none tracking-[-0.02em] text-foreground md:text-[2.5rem]">
                      {s.value}
                    </div>
                    <div className="mt-3 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* TRUST */}
        <section className="bg-background py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 max-w-2xl">
              <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <span className="h-px w-6 bg-foreground/30" />
                Kvalitetsfilter
              </span>
              <h2 className="mt-5 text-[2rem] font-semibold leading-[1.04] tracking-[-0.025em] text-foreground md:text-[2.75rem] lg:text-[3.25rem]">
                Sådan sikrer vi kvaliteten
              </h2>
              <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground md:text-base">
                Fire ting vi tjekker — eller insisterer på — før et firma er synligt på platformen.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: ShieldCheck, label: "CVR-verificerede firmaer", body: "Vi tjekker CVR, branche og status før et firma kommer på platformen." },
                { icon: BadgeCheck, label: "Oplyste forsikringer", body: "Udbydere kan dokumentere forsikring og certificeringer direkte på deres profil." },
                { icon: MessageSquare, label: "Direkte kontakt", body: "Du kommunikerer direkte med firmaet — ingen mellemled der forsinker." },
                { icon: Star, label: "Kun rigtige anmeldelser", body: "Når anmeldelser går live, kommer de udelukkende fra kunder med en gennemført opgave." },
              ].map(({ icon: Icon, label, body }) => (
                <div
                  key={label}
                  className="group flex flex-col rounded-[24px] border border-border/70 bg-card p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-border"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-background">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 text-[15px] font-semibold leading-tight tracking-tight text-foreground">{label}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* STEPS */}
        <section className="bg-secondary py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 max-w-2xl">
              <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                <span className="h-px w-6 bg-foreground/30" />
                Sådan virker anmeldelser
              </span>
              <h2 className="mt-5 text-[2rem] font-semibold leading-[1.04] tracking-[-0.025em] text-foreground md:text-[2.75rem] lg:text-[3.25rem]">
                Knyttet til en reel opgave
              </h2>
              <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground md:text-base">
                Vi vil hellere have få ærlige anmeldelser end mange opdigtede. Derfor viser
                vi først anmeldelser her, når de er knyttet til en gennemført opgave fra platformen.
              </p>
            </div>
            <div className="relative grid gap-4 sm:gap-5 md:grid-cols-3">
              <div aria-hidden className="pointer-events-none absolute left-[12%] right-[12%] top-14 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
              {[
                { n: 1, title: "Opgaven gennemføres", text: "Kunden bestiller en service via en udbyders profil eller gennem tilbudsflowet." },
                { n: 2, title: "Kunden inviteres", text: "Efter opgaven sender vi en invitation til at vurdere udbyderen — 1–5 stjerner og en kort kommentar." },
                { n: 3, title: "Anmeldelsen offentliggøres", text: "Anmeldelsen vises på udbyderens profil og indgår i den samlede vurdering." },
              ].map((s) => (
                <div
                  key={s.n}
                  className="group relative flex flex-col rounded-[28px] border border-border/70 bg-card p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-border"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background font-semibold">
                      {s.n}
                    </div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/70">
                      Trin {s.n}
                    </div>
                  </div>
                  <h3 className="mt-8 text-xl font-semibold tracking-tight text-foreground">{s.title}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-muted-foreground">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WIDGET CTA */}
        <section className="bg-background py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <LocalQuoteWidget
              heading="Prøv selv — beskriv opgaven, modtag op til 3 tilbud"
              description="Vælg service og by — vi sender dig direkte ind i tilbudsflowet."
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Reviews;