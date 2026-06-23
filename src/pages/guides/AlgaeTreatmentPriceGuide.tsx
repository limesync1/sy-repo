import { defineGuidePage } from "./defineGuidePage";

export default defineGuidePage({
  canonicalPath: "/priser/algebehandling",
  metaTitle: "Algebehandling pris 2026 — tag, facade & terrasse | Serviceydere",
  metaDescription:
    "Hvad koster algebehandling af tag, facade og terrasse i 2026? Softwash vs. højtryk, pris pr. m² og hvor længe holder en behandling.",
  keywords: "algebehandling pris, algebehandling tag pris, softwash pris, facade algebehandling, tag rensning",
  heroEyebrow: "Prisguide · Opdateret august 2026",
  heroTitle: "Hvad koster algebehandling i 2026?",
  heroSubtitle:
    "Tag, facade og terrasse — pris pr. m², forskellen på softwash og højtryk, og hvad behandlingen reelt holder.",
  breadcrumbLabel: "Algebehandling",
  ctaCategory: "Algebehandling",
  publishedAt: "2026-08-02",
  quickFacts: [
    <>Tag (softwash): <strong>35–60 kr./m²</strong></>,
    <>Tag (højtryk): <strong>25–40 kr./m²</strong> — slider mere</>,
    <>Facade: <strong>30–55 kr./m²</strong></>,
    <>Holdbarhed: <strong>3–5 år</strong> ved softwash</>,
  ],
  priceTable: {
    rows: [
      { label: "Tag — softwash + algedræber", price: "35–60 kr./m²", note: "Anbefalet metode" },
      { label: "Tag — højtryksrensning", price: "25–40 kr./m²", note: "Slider på taget" },
      { label: "Facade — softwash", price: "30–55 kr./m²", note: "Inkl. afdækning" },
      { label: "Terrasse — rensning", price: "20–40 kr./m²", note: "Fliser/træ" },
      { label: "Imprægnering (efter)", price: "25–50 kr./m²", note: "Forlænger virkning" },
      { label: "Parcelhustag 120 m² (total)", price: "4.500–7.500 kr.", note: "Komplet softwash" },
    ],
    footnote: "Vejledende priser inkl. moms. Krav om sikker adgang (lift/stillads) kan give tillæg.",
  },
  sections: [
    {
      heading: "Softwash vs. højtryksrensning",
      paragraphs: [
        "Softwash bruger lavt tryk og biologisk algedræber. Det er skånsomt mod taget, langtidsvirkende (3–5 år) og lidt dyrere. Højtryksrensning giver hurtigt visuelt resultat, men slider på overfladen og algerne kommer hurtigt igen.",
        "Til tegl og betontagsten anbefales softwash. Til eternit skal du være ekstra varsom — fibrene kan blive frigjort, og taget skal vurderes inden behandling.",
      ],
    },
    {
      heading: "Process for typisk behandling",
      ordered: [
        "Forundersøgelse — er tagstenene intakte? Skal defekte sten skiftes først?",
        "Afdækning af tagrender, planter og terrasse.",
        "Påføring af biologisk algedræber.",
        "Skånsom afrensning (softwash) eller passiv 'self-clean' over 6–12 måneder.",
        "Imprægnering (valgfrit, øger levetiden).",
      ],
    },
    {
      heading: "Faldgruber",
      list: [
        "Højtryksrensning på gammelt eternit — kan frigøre sundhedsskadelige fibre.",
        "'For-godt-til-at-være-sandt' priser uden softwash — typisk bare højtryk uden efterbehandling.",
        "Behandling i temperaturer under 5°C — produktet virker dårligt.",
        "Manglende afdækning af planter — algedræberen kan skade dem.",
      ],
    },
  ],
  faq: [
    { q: "Hvor længe holder en algebehandling?", a: "En grundig softwash + langtidsvirkende algedræber holder 3–5 år. Højtryksrensning uden efterbehandling holder kun 1–2 år." },
    { q: "Kan jeg selv algebehandle?", a: "Du kan købe algedræber i byggemarkedet og sprøjte fra jorden — men resultatet bliver ofte ujævnt, og adgang til tag kræver lift. Til store flader er det sjældent en god DIY-opgave." },
    { q: "Er algebehandling fradragsberettiget?", a: "Ja — algebehandling af tag og facade er omfattet af BoligJob-ordningen, så længe virksomheden er momsregistreret og du betaler digitalt." },
    { q: "Hvilken årstid er bedst?", a: "Forår og sensommer er optimalt — temperaturen skal være over 5°C, og det skal være tørt 12 timer efter behandling." },
  ],
  cta: {
    heading: "Få taget eller facaden ren igen",
    body: "Få op til 3 gratis tilbud på algebehandling fra verificerede firmaer — sammenlign metode og pris.",
    secondaryLabel: "Se firmaer",
    secondaryHref: "/virksomheder?category=Algebehandling",
  },
});