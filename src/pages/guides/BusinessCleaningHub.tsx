import { defineGuidePage } from "./defineGuidePage";

export default defineGuidePage({
  canonicalPath: "/guides/erhvervsrengoering",
  metaTitle: "Erhvervsrengøring 2026 — pris pr. m² & rengøringsfirma",
  metaDescription:
    "Erhvervsrengøring af kontor, butik og klinik: se priser fra 8 kr. pr. m² pr. måned, hvad en aftale bør indeholde, og få 3 gratis tilbud fra rengøringsfirmaer.",
  keywords: "erhvervsrengøring, erhvervsrengøring pris, kontorrengøring, rengøringsfirma erhverv, rengøring af kontor",
  heroEyebrow: "Guide · Erhvervsrengøring",
  heroTitle: "Erhvervsrengøring i 2026 — komplet guide",
  heroSubtitle: "Sådan får du en fast rengøringsaftale til kontor, butik eller klinik — med priser og tjekliste.",
  breadcrumbLabel: "Erhvervsrengøring",
  ctaCategory: "Rengøring",
  publishedAt: "2026-10-02",
  quickFacts: [
    <>Fast aftale: <strong>8–18 kr. pr. m² pr. måned</strong></>,
    <>Engangs- og hovedrengøring: <strong>220–380 kr./t</strong> ekskl. moms</>,
    <>Store arealer og hyppige besøg ligger i den lave ende</>,
    <>Ingen BoligJob-fradrag — men udgiften er en driftsomkostning</>,
  ],
  priceTable: {
    headers: { label: "Aftale", price: "Typisk pris", note: "Bemærkning" },
    rows: [
      { label: "Fast aftale", price: "8–18 kr./m² pr. md.", note: "Lavest ved store arealer" },
      { label: "Engangs- og hovedrengøring", price: "220–380 kr./t", note: "Ekskl. moms" },
    ],
    footnote: "Priser ekskl. moms for erhverv.",
  },
  sections: [
    { heading: "Hvad bør en rengøringsaftale indeholde?", list: [
      <>En tydelig opgaveliste pr. rum og hyppighed</>,
      <>Tidspunkt for rengøring, fx før eller efter åbningstid</>,
      <>Nøgle- og alarmhåndtering</>,
      <>Kvalitetskontrol og hvem du kontakter ved fejl</>,
      <>Opsigelsesvarsel og prisregulering</>,
    ]},
    { heading: "Typer af erhvervsrengøring", list: [
      <><strong>Kontorrengøring:</strong> skriveborde, køkken, toiletter og gulve.</>,
      <><strong>Butik og showroom:</strong> gulve, glas og indgangsparti.</>,
      <><strong>Klinik:</strong> skærpede krav til hygiejne og dokumentation.</>,
      <><strong>Trappevask og fællesarealer</strong> for foreninger og udlejere.</>,
    ]},
    { heading: "Sådan vælger du rengøringsfirma", list: [
      <>Bed om besigtigelse, så tilbuddet bygger på det rigtige areal.</>,
      <>Tjek CVR, forsikring og referencer fra lignende virksomheder.</>,
      <>Sammenlign 2–3 tilbud på samme opgaveliste.</>,
    ]},
    { heading: "Læs videre", list: [
      <a href="/priser/rengoering">Rengøring pris 2026 — fuld prisguide</a>,
      <a href="/guides/privatrengoering">Privatrengøring</a>,
      <a href="/guides/vinduespudsning">Vinduespudsning</a>,
      <a href="/guides/rengoering">Rengøring — komplet guide</a>,
    ]},
  ],
  faq: [
    { q: "Hvad koster erhvervsrengøring?", a: "Typisk 8–18 kr. pr. m² pr. måned ved fast aftale, eller 220–380 kr. i timen ekskl. moms ved engangs- eller hovedrengøring." },
    { q: "Kan virksomheder få fradrag for rengøring?", a: "BoligJob-fradraget gælder kun private hjem, men rengøring er en almindelig driftsudgift for virksomheder." },
    { q: "Hvor ofte skal et kontor gøres rent?", a: "De fleste kontorer har rengøring 1–5 gange om ugen afhængigt af antal medarbejdere og besøgende." },
  ],
  cta: {
    heading: "Find et rengøringsfirma til din virksomhed",
    body: "Få 3 gratis tilbud på erhvervsrengøring.",
    secondaryLabel: "Se rengøring pris",
    secondaryHref: "/priser/rengoering",
  },
});
