import { defineGuidePage } from "./defineGuidePage";

// SEO-mål: "varmepumpe pris" (880/md, KDI 23). Konkurrenter rangerer
// tunge guides — vi adresserer både luft-til-vand og luft-til-luft, tilskud
// (Bygningspuljen 2026) og tilbagebetalingstid, så vi rammer både
// transaktionel og informational intent.
export default defineGuidePage({
  canonicalPath: "/priser/varmepumpe",
  metaTitle: "Varmepumpe pris 2026 — installation, tilskud & tilbagebetaling | Serviceydere",
  metaDescription:
    "Hvad koster en varmepumpe installeret i 2026? Pris for luft-til-vand og luft-til-luft, tilskud fra Bygningspuljen, drift og realistisk tilbagebetalingstid.",
  keywords:
    "varmepumpe pris, varmepumpe installation pris, luft til vand pris, luft til luft pris, varmepumpe tilskud 2026, bygningspuljen, varmepumpe tilbagebetalingstid",
  heroEyebrow: "Prisguide · Opdateret 2026",
  heroTitle: "Hvad koster en varmepumpe i 2026?",
  heroSubtitle:
    "Komplet prisguide til luft-til-vand og luft-til-luft varmepumper — installation, tilskud, driftsudgifter og hvornår investeringen er tjent hjem.",
  breadcrumbLabel: "Varmepumpe",
  ctaCategory: "VVS",
  publishedAt: "2026-09-26",
  quickFacts: [
    <>Luft-til-vand installeret: <strong>95.000–160.000 kr.</strong> inkl. moms</>,
    <>Luft-til-luft installeret: <strong>18.000–35.000 kr.</strong> inkl. moms</>,
    <>Tilskud (Bygningspuljen): <strong>op til 24.000 kr.</strong> ved skifte fra olie/gas</>,
    <>Typisk tilbagebetalingstid: <strong>5–9 år</strong> ved skifte fra gas/olie</>,
  ],
  priceTable: {
    rows: [
      { label: "Luft-til-vand (parcelhus 130 m²)", price: "95.000–140.000 kr.", note: "Inkl. installation" },
      { label: "Luft-til-vand (større hus 180–220 m²)", price: "125.000–160.000 kr.", note: "Inkl. installation" },
      { label: "Luft-til-luft (1 zone)", price: "18.000–28.000 kr.", note: "Inkl. installation" },
      { label: "Luft-til-luft (multisplit, 2–3 zoner)", price: "28.000–45.000 kr.", note: "Inkl. installation" },
      { label: "Akkumuleringstank (200–300 l)", price: "8.000–14.000 kr.", note: "Ofte påkrævet" },
      { label: "Årligt serviceeftersyn", price: "1.200–2.500 kr.", note: "Anbefales hvert år" },
    ],
    footnote:
      "Vejledende priser inkl. moms og standardinstallation. Lange rørtræk, gravearbejde og 3-faset el kan give tillæg på 10.000–35.000 kr.",
  },
  sections: [
    {
      heading: "Luft-til-vand vs. luft-til-luft — hvad skal du vælge?",
      paragraphs: [
        "Luft-til-vand erstatter dit gas- eller oliefyr og leverer både varme til radiatorer/gulvvarme og varmt brugsvand. Det er den klare anbefaling hvis du i dag har vandbåren varme.",
        "Luft-til-luft er en split-løsning der blæser varm/kølig luft direkte ind i rummet. Den er billigere, men erstatter ikke dit varmtvandsanlæg og fordeler ikke varmen optimalt i alle rum. Bedst som tilskudsvarme eller i sommerhus.",
      ],
    },
    {
      heading: "Tilskud og fradrag i 2026",
      list: [
        <><strong>Bygningspuljen</strong> — op til 24.000 kr. ved skifte fra olie- eller gasfyr (begrænset pulje, ansøg tidligt på året).</>,
        <><strong>Skrotpræmie</strong> — visse kommuner giver 5.000–10.000 kr. for fjernelse af gammel oliefyr/tank.</>,
        <><strong>Håndværkerfradrag</strong> — arbejdsløn på varmepumpe-installation er omfattet (op til 8.600 kr./voksen i 2026).</>,
        <><strong>Reduceret elafgift</strong> — varmepumpens elforbrug afregnes til lavere elvarme-tarif efter ca. 4.000 kWh/år.</>,
      ],
    },
    {
      heading: "5 faktorer der påvirker prisen",
      ordered: [
        <><strong>Husets isoleringstilstand</strong> — dårligt isolerede huse kræver større pumpe (højere kW) og koster mere.</>,
        <><strong>Vandbåren eller luftbåren varme</strong> — har du allerede radiatorer/gulvvarme spares 15.000–30.000 kr.</>,
        <><strong>El-installation</strong> — kræver 3-faset el. Mangler det skal du ofte have ny tavle (8.000–15.000 kr.).</>,
        <><strong>Udedel placering</strong> — afstand fra teknikrum til udedel og evt. støjkrav til naboskel.</>,
        <><strong>Mærke & garanti</strong> — danske/skandinaviske mærker (Bosch, Nibe, Vølund) ligger 10–25% over asiatiske.</>,
      ],
    },
    {
      heading: "Sådan ser regnestykket ud — eksempel",
      paragraphs: [
        "Et parcelhus på 140 m² med oliefyr bruger typisk 2.500 liter olie/år (~25.000 kr. inkl. afgifter). Skifter du til luft-til-vand falder energiudgiften til 8.000–12.000 kr./år — en årlig besparelse på 13.000–17.000 kr.",
        "Med en samlet investering på 110.000 kr. minus 24.000 kr. i tilskud (= 86.000 kr.) er tilbagebetalingstiden 5–7 år. Resten af pumpens levetid (15–20 år) er nettogevinst.",
      ],
    },
    {
      heading: "Hvad skal du have med i tilbuddet?",
      list: [
        <>Dimensionering: kW-størrelse, SCOP-tal og anbefalet pumpemodel — begrundet ud fra dit boligareal og isolering.</>,
        <>Komplet pakke: udedel, indedel, akkumuleringstank, rør, isolering, el-installation og opstart.</>,
        <>Garanti: minimum 5 år på kompressor og 2 år på øvrige dele.</>,
        <>Serviceaftale: hvad koster årligt serviceeftersyn, og hvor lang responstid ved nedbrud.</>,
        <>Energimærkning: A++ eller A+++ — kræves for tilskud.</>,
      ],
    },
  ],
  faq: [
    { q: "Hvad koster en varmepumpe installeret i 2026?", a: "Luft-til-vand til et typisk parcelhus koster 95.000–160.000 kr. inkl. moms og installation. Luft-til-luft ligger på 18.000–45.000 kr. afhængigt af antal zoner." },
    { q: "Hvor stort er Bygningspuljens tilskud i 2026?", a: "Du kan få op til 24.000 kr. i tilskud ved skifte fra olie- eller gasfyr til varmepumpe. Puljen er begrænset og fordeles efter først-til-mølle, så ansøg så snart den åbner." },
    { q: "Kan jeg trække varmepumpe fra i skat?", a: "Selve apparatet kan ikke trækkes fra, men arbejdslønnen ved installationen kan trækkes via Håndværkerfradraget (op til 8.600 kr./voksen i 2026)." },
    { q: "Hvor lang er tilbagebetalingstiden?", a: "5–7 år ved skifte fra olie eller gas, 8–12 år ved skifte fra elvarme. Varmepumpens levetid er typisk 15–20 år." },
    { q: "Skal varmepumpen serviceres?", a: "Ja — minimum hvert år. Et serviceeftersyn koster 1.200–2.500 kr. og forlænger pumpens levetid betragteligt." },
    { q: "Støjer en varmepumpe meget?", a: "Moderne varmepumper ligger på 35–45 dB ved 1 meter — sammenligneligt med en hvisken. Tjek altid kommunens støjkrav til naboskel (typisk 35 dB om natten)." },
  ],
  cta: {
    heading: "Klar til at indhente tilbud på varmepumpe?",
    body: "Få op til 3 gratis, uforpligtende tilbud fra autoriserede VVS-installatører i dit område — så du kan sammenligne pris, garanti og dimensionering.",
    secondaryLabel: "Se VVS-installatører",
    secondaryHref: "/virksomheder?category=VVS",
  },
});