import { defineGuidePage } from "./defineGuidePage";

// SEO-mål: "kloak pris" (30/md) + "kloakmester pris" + "tv-inspektion kloak pris".
export default defineGuidePage({
  canonicalPath: "/priser/kloakmester",
  metaTitle: "Kloakmester pris 2026 — TV-inspektion, spuling & rørudskiftning | Serviceydere",
  metaDescription:
    "Hvad koster en kloakmester i 2026? Timepris, TV-inspektion, højtryksspuling, omfangsdræn og udskiftning af kloakledninger — komplet prisguide.",
  keywords:
    "kloakmester pris, tv inspektion kloak pris, kloak spuling pris, kloakrenovering pris, omfangsdræn pris",
  heroEyebrow: "Prisguide · Opdateret 2026",
  heroTitle: "Hvad koster en kloakmester i 2026?",
  heroSubtitle:
    "Realistiske priser på TV-inspektion, højtryksspuling, omfangsdræn og udskiftning af kloakledninger — plus hvad forsikringen typisk dækker.",
  breadcrumbLabel: "Kloakmester",
  ctaCategory: "VVS",
  publishedAt: "2026-09-26",
  quickFacts: [
    <>Timepris autoriseret kloakmester: <strong>650–850 kr.</strong> inkl. moms</>,
    <>TV-inspektion: <strong>2.500–4.500 kr.</strong> for parcelhus</>,
    <>Højtryksspuling: <strong>2.200–4.500 kr.</strong> for tilstopning</>,
    <>Husforsikring dækker typisk skader fra brud — ikke vedligehold</>,
  ],
  priceTable: {
    rows: [
      { label: "Akutudkald (uden for normal arbejdstid)", price: "1.800–3.500 kr.", note: "Plus timepris" },
      { label: "Højtryksspuling — tilstopning", price: "2.200–4.500 kr.", note: "Inkl. spulebil" },
      { label: "TV-inspektion (parcelhus)", price: "2.500–4.500 kr.", note: "Inkl. rapport" },
      { label: "Strømpeforing (no-dig renovering)", price: "3.500–6.500 kr./m", note: "Ingen opgravning" },
      { label: "Udskiftning af kloakrør (gravet)", price: "2.500–4.500 kr./m", note: "Inkl. gravearbejde" },
      { label: "Omfangsdræn omkring fundament", price: "1.500–2.800 kr./m", note: "Forebygger fugt" },
      { label: "Brønddæksel + opfyldning", price: "8.000–18.000 kr.", note: "Pr. brønd" },
      { label: "Rottespærre på kloak", price: "3.500–7.500 kr.", note: "Inkl. montering" },
    ],
    footnote:
      "Vejledende priser inkl. moms. Større gravearbejder med belægningsretablering (fliser, asfalt) lægges oveni — typisk 600–1.400 kr./m².",
  },
  sections: [
    {
      heading: "Hvornår skal du have kloakmester (og ikke selv klare det)?",
      paragraphs: [
        "Du må selv håndtere lette tilstopninger med svanehals, propren eller hjemmeudstyr. Men når problemet er hyppigt tilbagevendende, dårlig lugt, lyder af gurglen flere steder samtidig, eller vand i kælder/sokkel — så er der noget galt med selve kloakken, og det kræver en autoriseret kloakmester.",
        "Alle ændringer på kloakken (nye afløb, omlægninger, rottespærre) SKAL udføres af en autoriseret kloakmester for at være lovlige og forsikringsdækkede.",
      ],
    },
    {
      heading: "TV-inspektion — hvornår giver det mening?",
      list: [
        <>Før <strong>boligkøb</strong> (alle huse over 30 år bør TV-inspiceres).</>,
        <>Ved <strong>gentagne tilstopninger</strong> — der er ofte rødder eller brud.</>,
        <>Inden <strong>belægningsarbejde</strong> i indkørsel eller terrasse — så du ikke skal grave op senere.</>,
        <>Som <strong>dokumentation</strong> til forsikring efter skybrud eller jordbevægelser.</>,
      ],
    },
    {
      heading: "Forsikring og kommunens dækning",
      paragraphs: [
        "Husforsikringen (rør- og insektforsikring) dækker typisk pludselige brud på rør INDEN for huset og 1 m ud i jorden. Alt derudover er dit eget ansvar — frem til skel hvor kommunens hovedkloak begynder.",
        "Skader fra rødder, slid og dårlig vedligehold dækkes ikke. Skader fra skybrud kan være dækket via udvidet vandskadedækning — tjek din police.",
      ],
    },
    {
      heading: "Sådan får du den bedste pris",
      list: [
        <>Få <strong>tv-inspektion FØR</strong> du beslutter dig for opgravning — strømpeforing kan ofte spare 50–70% af prisen.</>,
        <>Bed om <strong>fast pris</strong> baseret på tv-inspektionsrapporten.</>,
        <>Få <strong>3 tilbud</strong> ved arbejder over 30.000 kr.</>,
        <>Tjek at firmaet er <strong>autoriseret kloakmester</strong> (DKAS-medlem) — krav for lovlig udførelse.</>,
        <>Aftal <strong>retablering</strong> af belægning som del af prisen, ikke som tillæg.</>,
      ],
    },
  ],
  faq: [
    { q: "Hvad koster en kloakmester i timen?", a: "Autoriseret kloakmester koster typisk 650–850 kr. i timen inkl. moms. Akutudkald uden for normal arbejdstid tillægges 1.800–3.500 kr." },
    { q: "Hvad koster en TV-inspektion af kloak?", a: "Standard TV-inspektion af et parcelhus' kloak (frem til skel) koster 2.500–4.500 kr. inkl. skriftlig rapport med videooptagelser." },
    { q: "Dækker forsikringen kloakskader?", a: "Husforsikringens rørforsikring dækker typisk pludselige brud — men ikke slid, rødder eller dårlig vedligeholdelse. Skybrudsskader kan være dækket via udvidet vandskadedækning." },
    { q: "Skal jeg have en autoriseret kloakmester?", a: "Ja — alle ændringer og reparationer på kloak skal udføres af en autoriseret kloakmester (DKAS) for at være lovlige og forsikringsdækkede." },
    { q: "Hvad er strømpeforing, og er det billigere?", a: "Strømpeforing er en no-dig metode hvor en harpiks-foring lægges inde i det eksisterende rør og hærdes — uden opgravning. Typisk 30–50% billigere end traditionel udskiftning." },
    { q: "Hvor ofte bør jeg spule kloakken?", a: "Forebyggende spuling er sjældent nødvendig i moderne kloakker. Har du tilbagevendende tilstopninger, så er det årsagen der skal findes — ikke gentagen spuling." },
  ],
  cta: {
    heading: "Brug for kloakmester?",
    body: "Få op til 3 gratis tilbud fra autoriserede kloakmestre i dit område — typisk svar inden for få timer ved akutopgaver.",
    secondaryLabel: "Se VVS & kloakmestre",
    secondaryHref: "/virksomheder?category=VVS",
  },
});