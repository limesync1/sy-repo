import { defineGuidePage } from "./defineGuidePage";

export default defineGuidePage({
  canonicalPath: "/guides/privatrengoering",
  metaTitle: "Privatrengøring 2026 — pris, fradrag & find rengøringshjælp | Serviceydere",
  metaDescription:
    "Privatrengøring fra 250 kr. i timen: se priser, fast aftale vs. engangsrengøring, BoligJob-fradrag og få 3 gratis tilbud fra lokale rengøringsfirmaer.",
  keywords: "privatrengøring, privat rengøring, rengøringshjælp, privatrengøring pris, rengøring pris, rengøringshjælp pris",
  heroEyebrow: "Guide · Privatrengøring",
  heroTitle: "Privatrengøring i 2026 — komplet guide",
  heroSubtitle: "Sådan finder du den rigtige rengøringshjælp til dit hjem: priser, fradrag, hyppighed og hvad du bør aftale.",
  breadcrumbLabel: "Privatrengøring",
  ctaCategory: "Rengøring",
  publishedAt: "2026-10-02",
  quickFacts: [
    <>Timepris: <strong>250–450 kr.</strong> inkl. moms</>,
    <>Fast aftale er typisk billigere end engangsrengøring</>,
    <>BoligJob-fradrag: op til <strong>12.300 kr. pr. voksen</strong></>,
    <>Firmaet skal være momsregistreret, og du skal betale digitalt</>,
  ],
  priceTable: {
    headers: { label: "Opgave", price: "Typisk pris", note: "Frekvens" },
    rows: [
      { label: "Fast rengøringshjælp", price: "250–450 kr./t", note: "Ugentligt / 14-dags" },
      { label: "Engangs- og hovedrengøring", price: "250–450 kr./t", note: "Efter behov" },
    ],
    footnote: "Priser inkl. moms. Servicefradraget reducerer den reelle udgift.",
  },
  sections: [
    { heading: "Hvad indgår i privatrengøring?", list: [
      <>Støvsugning og gulvvask i alle rum</>,
      <>Badeværelse og køkken, herunder toilet, håndvask og bordplader</>,
      <>Aftørring af overflader og støv</>,
      <>Ekstra opgaver som ovn, køleskab eller vinduer aftales særskilt</>,
    ]},
    { heading: "Hvor ofte skal du have rengøringshjælp?", list: [
      <><strong>Hver uge:</strong> børnefamilier og større boliger.</>,
      <><strong>Hver 14. dag:</strong> det mest almindelige valg.</>,
      <><strong>Engangsrengøring:</strong> hovedrengøring, før indflytning eller efter håndværkere.</>,
    ]},
    { heading: "Sådan vælger du rengøringsfirma", list: [
      <>Tjek CVR, ansvarsforsikring og anmeldelser fra andre kunder.</>,
      <>Få en skriftlig aftale om pris, opgaver og nøglehåndtering.</>,
      <>Spørg om det er samme person hver gang.</>,
      <>Sammenlign 2–3 tilbud.</>,
    ]},
    { heading: "Læs videre", list: [
      <a href="/priser/rengoering">Rengøring pris 2026 — fuld prisguide</a>,
      <a href="/guides/erhvervsrengoering">Erhvervsrengøring</a>,
      <a href="/guides/servicefradrag-2026">Servicefradrag 2026</a>,
      <a href="/guides/rengoering">Rengøring — komplet guide</a>,
    ]},
  ],
  faq: [
    { q: "Hvad koster privatrengøring?", a: "Typisk 250–450 kr. i timen inkl. moms afhængigt af område, hyppighed og opgaver." },
    { q: "Kan jeg trække privatrengøring fra?", a: "Ja. Med servicefradraget kan du i 2026 trække op til 12.300 kr. pr. person fra, når firmaet er momsregistreret og du betaler digitalt." },
    { q: "Skal jeg selv stille rengøringsmidler?", a: "Det varierer. Mange firmaer medbringer selv, men aftal det på forhånd." },
  ],
  cta: {
    heading: "Find rengøringshjælp nær dig",
    body: "Få 3 gratis tilbud på privatrengøring fra lokale firmaer.",
    secondaryLabel: "Se rengøring pris",
    secondaryHref: "/priser/rengoering",
  },
});
