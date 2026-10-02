import { defineGuidePage } from "./defineGuidePage";

export default defineGuidePage({
  canonicalPath: "/guides/vinduespudsning",
  metaTitle: "Vinduespudsning 2026 — find vinduespudser & se priser | Serviceydere",
  metaDescription:
    "Vinduespudsning til hjem og erhverv: se priser fra 25 kr. pr. vindue, abonnement vs. engangsbesøg, BoligJob-fradrag og få 3 gratis tilbud fra lokale vinduespudsere.",
  keywords: "vinduespudsning, vinduespudser, vinduespudser pris, vinduespudsning pris, vinduespudsning abonnement, vinduespudsning erhverv",
  heroEyebrow: "Guide · Vinduespudsning",
  heroTitle: "Vinduespudsning i 2026 — komplet guide",
  heroSubtitle: "Alt om vinduespudsning: priser, hvor ofte vinduerne bør pudses, fradrag og hvordan du vælger den rigtige vinduespudser.",
  breadcrumbLabel: "Vinduespudsning",
  ctaCategory: "Vinduespudsning",
  publishedAt: "2026-10-02",
  quickFacts: [
    <>Abonnement: <strong>25–45 kr. pr. vindue</strong></>,
    <>Engangsbesøg: <strong>35–60 kr. pr. vindue</strong></>,
    <>Villa (20–25 vinduer): <strong>500–1.200 kr. pr. besøg</strong></>,
    <>BoligJob-fradrag: op til 12.300 kr. pr. voksen</>,
  ],
  priceTable: {
    headers: { label: "Bolig", price: "Abonnement", note: "Engangsbesøg" },
    rows: [
      { label: "Lejlighed (5–8 vinduer)", price: "150–320 kr.", note: "200–450 kr." },
      { label: "Rækkehus (12–15 vinduer)", price: "350–600 kr.", note: "450–800 kr." },
      { label: "Standard villa (20–25 vinduer)", price: "500–1.000 kr.", note: "700–1.400 kr." },
      { label: "Erhverv (pr. m² facade)", price: "12–25 kr./m²", note: "18–35 kr./m²" },
    ],
    footnote: "Priser inkl. moms for private. Se den fulde prisguide for flere eksempler.",
  },
  sections: [
    { heading: "Hvor ofte skal vinduerne pudses?", list: [
      <><strong>Hver 4.–8. uge:</strong> det mest almindelige for private med abonnement.</>,
      <><strong>2–4 gange om året:</strong> nok for mange lejligheder og boliger med lidt trafik.</>,
      <><strong>Hver 2.–4. uge:</strong> typisk for butikker og erhverv med facadevinduer.</>,
    ]},
    { heading: "Hvad påvirker prisen på vinduespudsning?", list: [
      <>Antal vinduer og sprosser — sprossevinduer tager længere tid</>,
      <>Højde og adgang, fx 1. sal, ovenlysvinduer eller lift</>,
      <>Indvendig pudsning ud over udvendig</>,
      <>Fast abonnement giver typisk lavere pris pr. besøg end engangsbesøg</>,
    ]},
    { heading: "Sådan vælger du en vinduespudser", list: [
      <>Tjek at firmaet er CVR-registreret og har ansvarsforsikring.</>,
      <>Få prisen oplyst pr. besøg, og spør om ind- og udvendig er med.</>,
      <>Betal digitalt, så du kan få BoligJob-fradrag.</>,
      <>Sammenlign 2–3 tilbud fra lokale vinduespudsere.</>,
    ]},
    { heading: "Læs videre", list: [
      <a href="/priser/vinduespudser">Vinduespudsning pris 2026 — fuld prisguide</a>,
      <a href="/guides/servicefradrag-2026">Servicefradrag 2026</a>,
      <a href="/guides/rengoering">Rengøring — komplet guide</a>,
    ]},
  ],
  faq: [
    { q: "Hvad koster vinduespudsning?", a: "Typisk 25–45 kr. pr. vindue med abonnement og 35–60 kr. ved engangsbesøg. En villa med 20–25 vinduer koster 500–1.200 kr. pr. besøg." },
    { q: "Kan jeg få fradrag for vinduespudsning?", a: "Ja. Vinduespudsning er omfattet af servicefradraget på op til 12.300 kr. pr. voksen i 2026, når firmaet er momsregistreret og du betaler digitalt." },
    { q: "Pudser vinduespudseren også indvendigt?", a: "Mange gør, men det koster typisk ekstra. Aftal det på forhånd." },
  ],
  cta: {
    heading: "Find en vinduespudser nær dig",
    body: "Få 3 gratis tilbud på vinduespudsning fra lokale firmaer.",
    secondaryLabel: "Se vinduespudsning pris",
    secondaryHref: "/priser/vinduespudser",
  },
});
