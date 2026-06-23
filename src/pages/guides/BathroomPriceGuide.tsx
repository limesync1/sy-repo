import { defineGuidePage } from "./defineGuidePage";

// SEO-mål: "nyt badeværelse pris" (720/md, KDI 15). Komplet totalpris-guide.
export default defineGuidePage({
  canonicalPath: "/priser/nyt-badevaerelse",
  metaTitle: "Nyt badeværelse pris 2026 — totalentreprise & m²-pris | Serviceydere",
  metaDescription:
    "Hvad koster et nyt badeværelse i 2026? Totalpris pr. m², standard vs. premium, hvad er inkluderet og typiske ekstraregninger. Komplet prisguide.",
  keywords:
    "nyt badeværelse pris, badeværelse pris pr m2, totalrenovering badeværelse, badeværelse totalentreprise, vådrumsmembran pris",
  heroEyebrow: "Prisguide · Opdateret 2026",
  heroTitle: "Hvad koster et nyt badeværelse i 2026?",
  heroSubtitle:
    "Realistiske totalpriser pr. m² fra basis til premium — inkl. vådrumsmembran, gulvvarme, sanitet, fliser og typiske ekstraregninger du skal regne med.",
  breadcrumbLabel: "Nyt badeværelse",
  ctaCategory: "Håndværker",
  publishedAt: "2026-09-26",
  quickFacts: [
    <>Basis (4–6 m² lejlighed): <strong>110.000–165.000 kr.</strong> totalentreprise</>,
    <>Standard parcelhus (6–10 m²): <strong>165.000–280.000 kr.</strong></>,
    <>Premium (10–15 m² med spa/sauna): <strong>280.000–500.000 kr.</strong></>,
    <>Håndværkerfradrag: arbejdsløn er omfattet</>,
  ],
  priceTable: {
    rows: [
      { label: "Basis-renovering 5 m²", price: "110.000–165.000 kr.", note: "Standard fliser & sanitet" },
      { label: "Standard-renovering 8 m²", price: "180.000–260.000 kr.", note: "Inkl. gulvvarme" },
      { label: "Premium 10 m² (regnbruser, design)", price: "260.000–400.000 kr.", note: "Bedre materialer" },
      { label: "Vådrumsmembran (kemisk)", price: "550–900 kr./m²", note: "Lovkrav" },
      { label: "Gulvvarme (el)", price: "8.000–18.000 kr.", note: "Pr. badeværelse" },
      { label: "Fliser indkøbspris", price: "150–800 kr./m²", note: "Eksklusivt arbejde" },
      { label: "Bruseniche m. termostatbatteri", price: "8.000–22.000 kr.", note: "Standard kvalitet" },
      { label: "Komplet sanitet (toilet, vask, bruser)", price: "12.000–35.000 kr.", note: "Mellem til høj kvalitet" },
    ],
    footnote:
      "Vejledende totalentreprise inkl. moms. Standard 8 m² badeværelse = nedrivning, vådrumsmembran, nye rør og el, gulvvarme, fliser, sanitet og bortskaffelse.",
  },
  sections: [
    {
      heading: "Hvad er inkluderet i en totalentreprise?",
      list: [
        <>Nedrivning og bortskaffelse af eksisterende badeværelse</>,
        <>VVS — nye vandrør, afløb og montering af sanitet</>,
        <>El — ny gruppe, HFI-relæ, stikkontakter og lysplan</>,
        <>Mureren støber/retter gulvet og forbereder vægge</>,
        <>Vådrumsmembran (lovkrav — DS 439 + SBi-anvisning 252)</>,
        <>Gulvvarme — el-varme er standard i moderne badeværelser</>,
        <>Flisearbejde — gulv og vægge, op til loftet hvor relevant</>,
        <>Sanitet — toilet, vask, bruser/badekar og inventar</>,
      ],
    },
    {
      heading: "Standard vs. premium — hvor går pengene?",
      paragraphs: [
        "Forskellen mellem et 150.000 kr. og et 350.000 kr. badeværelse ligger sjældent i selve byggearbejdet (det er stort set det samme), men i materialevalg: storformat-fliser (60×120 cm) i stedet for 30×30, designsanitet fra Vola/Hansgrohe i stedet for danske mærker, indbyggede armaturer i stedet for væghængte, og specialløsninger som niche-lys og indbyggede skabe.",
        "Konkret pris-eksempel: To badeværelser på 8 m². Basis: 195.000 kr. Premium med Vola-armaturer, indbyggede skabe og storformat-fliser: 345.000 kr. — 150.000 kr. ekstra for samme byggearbejde.",
      ],
    },
    {
      heading: "Typiske ekstraregninger du skal regne med",
      ordered: [
        <><strong>Flytning af afløb</strong> — toilettet skal stå et nyt sted? 8.000–20.000 kr. ekstra.</>,
        <><strong>Nyt el-tavle</strong> — gammelt hus uden HFI? 6.000–14.000 kr.</>,
        <><strong>Asbest i gulvbelægning</strong> — vinyl fra før 1988 skal bortskaffes særskilt (4.000–18.000 kr.).</>,
        <><strong>Etagebyggeri</strong> — adgang via opgang og elevator-restriktioner giver tillægstid.</>,
        <><strong>Ekstrafundering</strong> — gamle huse uden gulvopbygning kræver støbt gulv (8.000–20.000 kr.).</>,
      ],
    },
    {
      heading: "Sådan får du den bedste pris",
      list: [
        <>Indhent <strong>3 totaltilbud</strong> med samme rumskema og samme sanitetsliste — så priserne er sammenlignelige.</>,
        <>Aftal <strong>opdelt pris</strong>: nedrivning, VVS, el, murer, fliser og sanitet — så du kan se hvor pengene går hen.</>,
        <>Tjek at firmaet er <strong>autoriseret VVS og el</strong> og at vådrumsmembran udføres efter <strong>DS 439</strong>.</>,
        <>Aftal <strong>AB-Forbruger</strong> + 1-års og 5-års gennemgang skriftligt.</>,
        <>Vælg sanitet selv hos forhandler — det er typisk 15–25% billigere end gennem håndværkeren.</>,
      ],
    },
  ],
  faq: [
    { q: "Hvad koster et nyt badeværelse pr. m² i 2026?", a: "Basis: 22.000–28.000 kr./m². Standard: 28.000–35.000 kr./m². Premium: 35.000–55.000 kr./m². Totalentreprise inkl. alle håndværkere og standardmaterialer." },
    { q: "Hvor lang tid tager renoveringen?", a: "Et standard 8 m² badeværelse tager typisk 4–6 uger fra nedrivning til ibrugtagning. Hertil 1–2 ugers ventetid på sanitet og fliser." },
    { q: "Skal jeg have byggetilladelse?", a: "Nej, ikke ved renovering inden for samme rum. Ja, hvis du flytter vådrum til et nyt rum eller udvider arealet." },
    { q: "Hvad er vådrumsmembran og er det lovkrav?", a: "Vådrumsmembran er en vandtæt membran (kemisk eller folie) der lægges under fliser i bruse- og badeområder. Det er lovpligtigt efter DS 439 i alle nye badeværelser." },
    { q: "Kan jeg trække badeværelse fra i skat?", a: "Selve materialerne kan ikke trækkes fra, men arbejdslønnen er omfattet af Håndværkerfradraget — op til 8.600 kr./voksen i 2026." },
    { q: "Hvor stor garanti har jeg?", a: "5 års garanti ved AB-Forbruger (skal aftales skriftligt). Vådrumsmembran har typisk 10 års producentgaranti, sanitet 2–5 år afhængigt af mærke." },
  ],
  cta: {
    heading: "Klar til at indhente badeværelse-tilbud?",
    body: "Få op til 3 gratis tilbud fra totalentreprenører i dit område — sammenlign pris, garanti og referencer.",
    secondaryLabel: "Se håndværkere",
    secondaryHref: "/virksomheder?category=H%C3%A5ndv%C3%A6rker",
  },
});