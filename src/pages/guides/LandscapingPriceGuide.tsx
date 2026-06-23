import { defineGuidePage } from "./defineGuidePage";

export default defineGuidePage({
  canonicalPath: "/priser/anlaegsgartner",
  metaTitle: "Anlægsgartner pris 2026 — terrasse, hæk & havedesign | Serviceydere",
  metaDescription:
    "Hvad koster en anlægsgartner i 2026? Fliseterrasse, træterrasse, hæk, bede og dræn — komplet prisguide med eksempler for hele Danmark.",
  keywords: "anlægsgartner pris, ny terrasse pris, fliseterrasse pris, hæk plantning pris, havedesign",
  heroEyebrow: "Prisguide · Opdateret juli 2026",
  heroTitle: "Hvad koster en anlægsgartner i 2026?",
  heroSubtitle:
    "Terrasse, hæk, bede og dræn — realistiske priser, proces fra første møde til færdig have, og hvad du bør have med i tilbuddet.",
  breadcrumbLabel: "Anlægsgartner",
  ctaCategory: "Anlægsgartner",
  publishedAt: "2026-07-28",
  quickFacts: [
    <>Fliseterrasse: <strong>1.200–2.200 kr./m²</strong> inkl. lægning</>,
    <>Træterrasse: <strong>900–1.800 kr./m²</strong></>,
    <>Hæk (10 lbm liguster): <strong>2.500–4.500 kr.</strong></>,
    <>Dræn i lerjord: <strong>500–900 kr./lbm</strong></>,
  ],
  priceTable: {
    rows: [
      { label: "Fliseterrasse (beton)", price: "1.200–2.200 kr./m²", note: "Inkl. lægning" },
      { label: "Fliseterrasse (granit/klinker)", price: "2.500–4.000 kr./m²", note: "Special-fliser" },
      { label: "Træterrasse (trykimprægneret)", price: "900–1.500 kr./m²", note: "Inkl. underlag" },
      { label: "Træterrasse (hårdttræ)", price: "1.800–3.500 kr./m²", note: "Ipe/cumaru" },
      { label: "Hækplantning (liguster)", price: "250–450 kr./lbm", note: "Inkl. plantning" },
      { label: "Anlæg af bed", price: "700–1.800 kr./m²", note: "Inkl. planter" },
      { label: "Drænarbejde (lerjord)", price: "500–900 kr./lbm", note: "Faskine ekstra" },
    ],
    footnote: "Vejledende priser inkl. moms. Større projekter kan opnå mængderabat.",
  },
  sections: [
    {
      heading: "Start med funktionen, ikke æstetikken",
      paragraphs: [
        "Skal terrassen bruges til solnedgang, til grill, til leg eller til alle dele? Antal personer ved bordet (typisk 1,2 m² pr. person) afgør størrelsen. Skygge fra hus og træer afgør placeringen.",
      ],
    },
    {
      heading: "Fliser, træ eller komposit?",
      list: [
        <><strong>Beton-/granitfliser:</strong> Lang levetid, lav vedligehold, ensartet udseende.</>,
        <><strong>Trykimprægneret fyr:</strong> Billigt, varmt at gå på, kræver olie hvert 2.–3. år.</>,
        <><strong>Hårdttræ (ipe, cumaru):</strong> Smukt, holder 30+ år, dyrt og tungt at lægge.</>,
        <><strong>Komposit:</strong> Vedligeholdsfrit, men kan blive varmt i sol.</>,
      ],
    },
    {
      heading: "Process — fra første møde til færdig have",
      ordered: [
        "Indledende besøg + opmåling (gratis).",
        "Skitseforslag og tilbud — gerne 2–3 firmaer.",
        "Detailplan med plantevalg, fliser, drænløsning og tidsplan.",
        "Anlægsperiode — typisk 1–3 uger for almindelig parcelhushave.",
        "Aflevering med plejevejledning og opfølgende besøg efter 1 år.",
      ],
    },
    {
      heading: "Faldgruber",
      list: [
        "For lidt fald (terrassen skal hælde ~2% væk fra huset).",
        "For tyndt bærelag — flisen sætter sig efter første frost.",
        "Planter der vokser sig for store i forhold til bedet.",
        "Manglende dræn i lerjord — leder til våde sokler og fugtskader.",
      ],
    },
  ],
  faq: [
    { q: "Hvad koster en ny fliseterrasse på 30 m²?", a: "Typisk 35.000–65.000 kr. inkl. fliser, bærelag, opretning og lægning. Granit/klinker ligger højere på 75.000–120.000 kr." },
    { q: "Holder en træterrasse længere end fliser?", a: "Nej. En fliseterrasse holder 30–50 år. Trykimprægneret fyr holder 12–20 år; hårdttræ holder 25–40 år." },
    { q: "Skal jeg have byggetilladelse til terrasse?", a: "Terrasser under 30 cm høje uden tag er fritaget. Hævede terrasser, overdækninger og pergolaer kan kræve tilladelse — tjek altid med kommunen." },
    { q: "Kan jeg bruge BoligJob-fradraget på anlægsgartner?", a: "Almindelig havepleje (klipning, lugning) er omfattet. Nyetablering af terrasse og bed er typisk ikke — kontakt din kommune eller revisor for konkret vurdering." },
  ],
  cta: {
    heading: "Klar til at få haven, du drømmer om?",
    body: "Få op til 3 gratis tilbud fra anlægsgartnere i dit område — sammenlign forslag, priser og tidsplan.",
    secondaryLabel: "Se anlægsgartnere",
    secondaryHref: "/virksomheder?category=Anl%C3%A6gsgartner",
  },
});