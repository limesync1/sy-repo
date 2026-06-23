import { defineGuidePage } from "./defineGuidePage";

export default defineGuidePage({
  canonicalPath: "/priser/tomrer",
  metaTitle: "Tømrer pris 2026 — timepris, opgaver & BoligJob-fradrag | Serviceydere",
  metaDescription:
    "Hvad koster en tømrer i 2026? Timepris, akkord, terrasser, trapper og tilbygninger — komplet prisguide med eksempler og BoligJob-fradrag.",
  keywords: "tømrer pris, tømrer timepris, tømrer terrasse pris, tømrer tilbud, ab forbruger",
  heroEyebrow: "Prisguide · Opdateret juni 2026",
  heroTitle: "Hvad koster en tømrer i 2026?",
  heroSubtitle:
    "Komplet prisguide til tømreropgaver — timepris, akkord, terrasser, trapper og tilbygninger. Inkl. BoligJob-fradrag og hvad du skal kigge efter i tilbuddet.",
  breadcrumbLabel: "Tømrer",
  ctaCategory: "Tømrer",
  publishedAt: "2026-07-12",
  quickFacts: [
    <>Timepris: <strong>525–675 kr.</strong> inkl. moms</>,
    <>Træterrasse (30 m²): <strong>28.000–50.000 kr.</strong> inkl. materialer</>,
    <>Indvendig trappe: <strong>18.000–40.000 kr.</strong></>,
    <>BoligJob-fradrag op til <strong>12.300 kr./voksen</strong> på arbejdsløn</>,
  ],
  priceTable: {
    rows: [
      { label: "Tømrer timepris", price: "525–675 kr./t", note: "Inkl. moms" },
      { label: "Træterrasse (30 m²)", price: "28.000–50.000 kr.", note: "Inkl. materialer" },
      { label: "Indvendig trappe", price: "18.000–40.000 kr.", note: "Standard" },
      { label: "Carport (1 bil)", price: "35.000–80.000 kr.", note: "Inkl. materialer" },
      { label: "Køkkenmontage", price: "8.000–25.000 kr.", note: "Standard køkken" },
      { label: "Skift af inderdør", price: "1.500–3.500 kr.", note: "Pr. dør" },
    ],
    footnote: "Vejledende priser inkl. moms. Opdateret 2026.",
  },
  sections: [
    {
      heading: "Timepris vs. akkord",
      paragraphs: [
        "Til mindre opgaver (rådnesvampe-udskiftning, små reparationer, dørmontering) afregnes typisk pr. time. Til større opgaver — terrasse, carport, tilbygning — bruger tømrere ofte akkord, hvor du får en fast totalpris.",
        "Akkord er bedst når omfanget er klart defineret. Timepris er bedst når omfanget er svært at vurdere på forhånd.",
      ],
    },
    {
      heading: "5 faktorer der påvirker prisen",
      ordered: [
        <><strong>Materialevalg</strong> — trykimprægneret fyr er billigt; ipe, lærk og cumaru ligger 2–4 × højere.</>,
        <><strong>Adgangsforhold</strong> — smalt baghaveadgang, etager uden elevator giver tillægstid.</>,
        <><strong>Underlag</strong> — skal jorden afrettes, drænes eller fundamenteres? Tilføj typisk 5.000–25.000 kr.</>,
        <><strong>Sæson</strong> — sommer = højsæson og længere ventetid. Vinter giver ofte 5–10% rabat.</>,
        <><strong>Geografi</strong> — København og Aarhus ligger 10–20% over landsgennemsnit.</>,
      ],
    },
    {
      heading: "Hvornår skal du have AB-Forbruger?",
      paragraphs: [
        "AB-Forbruger er standardvilkår der bl.a. giver 5 års garanti, 1- og 5-års gennemgang og klare regler for tilbud, betaling og forsinkelse. Aftal altid at AB-Forbruger gælder på opgaver over 30.000 kr.",
      ],
    },
    {
      heading: "Sådan får du den bedste pris",
      list: [
        <>Indhent <strong>3 tilbud</strong> med samme detaljerede opgavebeskrivelse.</>,
        <>Bed om <strong>opdelt tilbud</strong>: arbejdsløn, materialer, byggeplads.</>,
        <>Tjek <strong>CVR + forsikring</strong> — ingen sort arbejde.</>,
        <>Aftal <strong>betaling i rater</strong> — aldrig hele beløbet forud.</>,
      ],
    },
  ],
  faq: [
    { q: "Hvad koster en tømrer i timen i 2026?", a: "Faglært tømrer koster typisk 525–675 kr. pr. time inkl. moms. Akkordpriser bruges ofte på større opgaver." },
    { q: "Kan jeg trække tømrer fra i skat?", a: "Ja. Almindelig vedligehold (skift af inderdør, terrasse-reparation, mindre håndværksopgaver) er omfattet af BoligJob-ordningen. Nybyg og tilbygninger er IKKE." },
    { q: "Hvor lang garanti har jeg på tømrerarbejde?", a: "5 år ved AB-Forbruger (skal aftales skriftligt i tilbuddet). Uden AB-aftale er det 2 år efter købeloven." },
    { q: "Skal jeg have byggetilladelse til carport?", a: "Carporte under 50 m² er typisk fritaget, men skal anmeldes til kommunen. Hævede terrasser og overdækninger kan kræve tilladelse — tjek altid med din kommune." },
  ],
  cta: {
    heading: "Klar til at indhente tømrertilbud?",
    body: "Få op til 3 gratis, uforpligtende tilbud fra verificerede tømrere i dit område.",
    secondaryLabel: "Se tømrere",
    secondaryHref: "/virksomheder?category=T%C3%B8mrer",
  },
});