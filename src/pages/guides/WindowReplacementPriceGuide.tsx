import { defineGuidePage } from "./defineGuidePage";

// SEO-mål: "udskiftning af vinduer pris" (210/md, KDI 15) + relaterede long-tails.
export default defineGuidePage({
  canonicalPath: "/priser/vinduesudskiftning",
  metaTitle: "Udskiftning af vinduer pris 2026 — pr. vindue & energiruder | Serviceydere",
  metaDescription:
    "Hvad koster det at udskifte vinduer i 2026? Pris pr. vindue, forskel på 2- og 3-lags energiruder, energibesparelse og hvilke tilskud du kan søge.",
  keywords:
    "udskiftning af vinduer pris, nye vinduer pris, energiruder pris, vinduer pris pr stk, 3 lags energiruder pris",
  heroEyebrow: "Prisguide · Opdateret 2026",
  heroTitle: "Hvad koster udskiftning af vinduer i 2026?",
  heroSubtitle:
    "Realistiske priser pr. vindue ved udskiftning, forskel på 2- og 3-lags energiruder, plus hvad du kan spare på varmeregningen og hvilke tilskud der findes.",
  breadcrumbLabel: "Vinduesudskiftning",
  ctaCategory: "Tømrer",
  publishedAt: "2026-09-26",
  quickFacts: [
    <>Standardvindue (1-fag) inkl. montering: <strong>5.500–9.500 kr.</strong></>,
    <>Fransk altandør: <strong>11.000–18.000 kr.</strong></>,
    <>3-lags energiruder giver <strong>20–35% lavere varmetab</strong> end 2-lags</>,
    <>Tilbagebetalingstid ved skifte fra 1980'er-vinduer: <strong>10–18 år</strong></>,
  ],
  priceTable: {
    rows: [
      { label: "Standard 1-fags vindue (120×120)", price: "5.500–9.500 kr.", note: "Inkl. montering" },
      { label: "2-fags vindue (180×120)", price: "8.500–13.500 kr.", note: "Inkl. montering" },
      { label: "Fransk altandør", price: "11.000–18.000 kr.", note: "Inkl. montering" },
      { label: "Tagvindue (Velux standard)", price: "8.500–14.500 kr.", note: "Inkl. montering" },
      { label: "Hævet/skydedør (3 m)", price: "28.000–55.000 kr.", note: "Aluminium/træ" },
      { label: "Demontering af gamle vinduer", price: "350–600 kr./stk", note: "Inkl. bortskaffelse" },
      { label: "Udvendig lysning / fugning", price: "400–900 kr./stk", note: "Afhænger af facade" },
    ],
    footnote:
      "Vejledende priser inkl. moms for træ-/aluminium-vinduer med 3-lags energiruder. Specialmål, buede vinduer og højde over 2½ etage giver tillæg.",
  },
  sections: [
    {
      heading: "2-lags vs. 3-lags energiruder",
      paragraphs: [
        "3-lags energiruder har 20–35% lavere varmetab (U-værdi 0,7–1,0 W/m²K vs. 1,1–1,3 for 2-lags). Prisforskellen er typisk 800–1.500 kr./vindue. Ved nybyg eller fuld renovering vælg altid 3-lags — tilbagebetalingstid 8–12 år.",
        "Ved punktudskiftning af enkelte vinduer kan 2-lags være fint, hvis huset i øvrigt har dårlig isolering — så er det ikke vinduerne der er flaskehalsen.",
      ],
    },
    {
      heading: "Tilskud og fradrag i 2026",
      list: [
        <><strong>Håndværkerfradrag</strong> — arbejdslønnen er omfattet (op til 8.600 kr./voksen i 2026).</>,
        <><strong>Bygningspuljen</strong> — udskiftning til energiruder kombineret med anden energirenovering kan udløse tilskud.</>,
        <><strong>Skattefri besparelse</strong> — lavere varmeregning er skattefri.</>,
      ],
    },
    {
      heading: "Energibesparelse — sådan ser regnestykket ud",
      paragraphs: [
        "Et typisk parcelhus fra 1970–1990 med 15 originale 2-lags termoruder bruger 3.500–5.000 kWh/år på varmetab gennem vinduerne. Skifter du til moderne 3-lags energiruder reduceres tabet med 50–65% — en årlig besparelse på 6.000–11.000 kr. ved aktuelle energipriser.",
        "Med en investering på 140.000 kr. (efter fradrag) er tilbagebetalingstiden 13–18 år. Vinduernes levetid er typisk 35–50 år, så investeringen er solid på den lange bane.",
      ],
    },
    {
      heading: "5 faktorer der påvirker prisen",
      ordered: [
        <><strong>Materiale</strong> — træ er billigst, træ/alu mellemtung, ren aluminium dyrest (men længst holdbarhed).</>,
        <><strong>Antal fag og åbningstype</strong> — drejekipvinduer er dyrere end faste eller topstyrede.</>,
        <><strong>Mål</strong> — specialmål øger prisen 20–60% pr. vindue.</>,
        <><strong>Højde/adgang</strong> — vinduer over 2½ etage kræver stillads (8.000–25.000 kr.).</>,
        <><strong>Facade-type</strong> — murede facader er lette, træfacader kræver mere efterarbejde.</>,
      ],
    },
    {
      heading: "Sådan får du den bedste pris",
      list: [
        <>Skift <strong>alle vinduer på én gang</strong> — du sparer 15–25% pr. vindue ift. punktudskiftning.</>,
        <>Indhent <strong>3 tilbud</strong> — ofte stor forskel mellem producent-direkte og lokale tømrere.</>,
        <>Bed om <strong>U-værdi og energimærke A++</strong> dokumenteret.</>,
        <>Tjek <strong>5 års garanti</strong> på montering og 10–15 års garanti på selve vinduet.</>,
        <>Aftal <strong>udvendig fugning + lysning</strong> som en del af prisen, ikke som tillæg.</>,
      ],
    },
  ],
  faq: [
    { q: "Hvad koster nye vinduer pr. stk i 2026?", a: "Standard 1-fagsvindue inkl. montering: 5.500–9.500 kr. 2-fagsvindue: 8.500–13.500 kr. Fransk altandør: 11.000–18.000 kr. Inkl. moms og 3-lags energiruder." },
    { q: "Skal jeg vælge 2- eller 3-lags energiruder?", a: "3-lags ved al udskiftning i 2026 — U-værdi 0,7–1,0 W/m²K mod 1,1–1,3 for 2-lags. Prisforskel typisk 800–1.500 kr./vindue, tilbagebetalingstid 8–12 år." },
    { q: "Hvor lang holdbarhed har nye vinduer?", a: "Træ: 30–40 år med vedligehold. Træ/alu: 40–50 år. Aluminium: 50+ år. Selve glasruden har typisk 15–25 års garanti mod punktering." },
    { q: "Kan jeg trække vinduesudskiftning fra i skat?", a: "Selve materialerne kan ikke trækkes fra, men arbejdslønnen er omfattet af Håndværkerfradraget — op til 8.600 kr./voksen i 2026." },
    { q: "Skal jeg have byggetilladelse?", a: "Nej, hvis du udskifter til samme størrelse og udseende. Ja, hvis du ændrer facadeudtryk væsentligt — typisk i bevaringsværdige områder eller for fredede bygninger." },
    { q: "Hvor lang tid tager udskiftningen?", a: "Et professionelt sjak skifter typisk 4–6 vinduer pr. dag. Et parcelhus med 15 vinduer er færdigt på 3–5 dage." },
  ],
  cta: {
    heading: "Klar til at indhente tilbud på nye vinduer?",
    body: "Få op til 3 gratis tilbud fra lokale tømrere og vinduesfirmaer — sammenlign U-værdi, garanti og pris.",
    secondaryLabel: "Se tømrere",
    secondaryHref: "/virksomheder?category=T%C3%B8mrer",
  },
});