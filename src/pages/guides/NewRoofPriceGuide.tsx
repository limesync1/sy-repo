import { defineGuidePage } from "./defineGuidePage";

// SEO-mål: "nyt tag pris" (1.600/md, KDI 28). Komplet pris-side med m²-priser
// pr. tagmateriale og hvad der typisk ligger ud over selve tagdækningen.
export default defineGuidePage({
  canonicalPath: "/priser/nyt-tag",
  metaTitle: "Nyt tag pris 2026 — tegl, stål, tagpap & skifer | Serviceydere",
  metaDescription:
    "Hvad koster nyt tag i 2026? Pris pr. m² for tegl, beton, stål, tagpap og skifer — inkl. nedrivning, undertag, tagrender og typiske faldgruber.",
  keywords:
    "nyt tag pris, nyt tag pris pr m2, tagrenovering pris, tegltag pris, ståltag pris, tagpap pris, undertag pris",
  heroEyebrow: "Prisguide · Opdateret 2026",
  heroTitle: "Hvad koster et nyt tag i 2026?",
  heroSubtitle:
    "Realistiske priser pr. m² på de mest brugte tagmaterialer i Danmark — plus hvad nedrivning, undertag, tagrender og inddækninger lægger oveni.",
  breadcrumbLabel: "Nyt tag",
  ctaCategory: "Håndværker",
  publishedAt: "2026-09-26",
  quickFacts: [
    <>Tegltag: <strong>1.250–1.700 kr./m²</strong> inkl. arbejde</>,
    <>Ståltag (Decra/profilplader): <strong>950–1.400 kr./m²</strong></>,
    <>Tagpap (2-lag): <strong>650–950 kr./m²</strong></>,
    <>Typisk totalpris parcelhus (150 m² tagareal): <strong>165.000–290.000 kr.</strong></>,
  ],
  priceTable: {
    rows: [
      { label: "Tegltag (røde/sorte)", price: "1.250–1.700 kr./m²", note: "Inkl. lægning + lægter" },
      { label: "Betontagsten", price: "1.050–1.400 kr./m²", note: "Lavere vægt end tegl" },
      { label: "Ståltag (profilplader)", price: "850–1.250 kr./m²", note: "Hurtig montage" },
      { label: "Ståltag (Decra/stentag)", price: "1.150–1.550 kr./m²", note: "Tegl-look, lav vægt" },
      { label: "Tagpap (2-lag svejset)", price: "650–950 kr./m²", note: "Fladt eller lavt tag" },
      { label: "Skifertag (naturskifer)", price: "2.200–3.400 kr./m²", note: "Lang holdbarhed (80–120 år)" },
      { label: "Nedrivning af gammelt tag", price: "150–280 kr./m²", note: "Inkl. bortskaffelse" },
      { label: "Nyt undertag (banevare/fast)", price: "180–360 kr./m²", note: "Næsten altid påkrævet" },
    ],
    footnote:
      "Vejledende priser inkl. moms og arbejde. Tagrender, inddækninger om skorsten, ovenlys og rygning lægges oveni — typisk 15.000–60.000 kr. afhængigt af tagets kompleksitet.",
  },
  sections: [
    {
      heading: "Hvad indgår i en typisk tagrenovering?",
      ordered: [
        <><strong>Nedrivning</strong> af eksisterende tagdækning og lægter (150–280 kr./m²).</>,
        <><strong>Stillads og affaldscontainere</strong> (12.000–35.000 kr.).</>,
        <><strong>Nyt undertag</strong> — banevare eller fast undertag i krydsfiner (180–360 kr./m²).</>,
        <><strong>Lægter & afstandslister</strong>.</>,
        <><strong>Selve tagdækningen</strong> i valgte materiale.</>,
        <><strong>Inddækninger</strong> om skorsten, ovenlys og kviste (3.000–12.000 kr. pr. stk).</>,
        <><strong>Tagrender og nedløb</strong> (12.000–28.000 kr. for parcelhus).</>,
      ],
    },
    {
      heading: "Tegl vs. stål vs. tagpap — hvad skal du vælge?",
      paragraphs: [
        "Tegl er klassikeren: 80–120 års holdbarhed, kræver minimal vedligehold og passer til de fleste danske parcelhuse. Til gengæld er det den tungeste og dyreste løsning.",
        "Stål (Decra eller profilplader) vejer 1/8 af tegl, kan ofte lægges direkte ovenpå eksisterende tag og monteres hurtigt. Holdbarhed 40–50 år.",
        "Tagpap er det billigste til flade eller lavt-hældende tage — typisk garage, carport eller funkis-villaer. 2-lags svejset pap holder 25–40 år.",
      ],
    },
    {
      heading: "5 faktorer der påvirker prisen",
      ordered: [
        <><strong>Tagets hældning og kompleksitet</strong> — mange grater, valme og kviste fordobler arbejdsløn.</>,
        <><strong>Højde</strong> — 1½ etage med kviste kræver stillads og giver tillæg.</>,
        <><strong>Skal asbest fjernes?</strong> — Eternit fra før 1988 er asbestholdig (tillæg 50.000–150.000 kr. til bortskaffelse).</>,
        <><strong>Geografi</strong> — København og Aarhus ligger 10–20% over landsgennemsnit.</>,
        <><strong>Sæson</strong> — vinter giver ofte 10% rabat men risiko for vejrforsinkelser.</>,
      ],
    },
    {
      heading: "Tilskud, fradrag og forsikring",
      list: [
        <><strong>Håndværkerfradrag</strong> — arbejdslønnen er omfattet (op til 8.600 kr./voksen i 2026).</>,
        <><strong>Bygningspuljen</strong> — efterisolering af loft i samme operation kan udløse tilskud.</>,
        <><strong>Husforsikring</strong> — tjek om stormskader eller punkterede tagsten dækkes inden du betaler selv.</>,
        <><strong>Byggetilladelse</strong> — tagudskiftning med samme materiale kræver ikke tilladelse; ændret tagform eller materiale gør.</>,
      ],
    },
  ],
  faq: [
    { q: "Hvad koster nyt tag pr. m² i 2026?", a: "Tegl: 1.250–1.700 kr./m², beton: 1.050–1.400 kr./m², stål: 850–1.550 kr./m², tagpap: 650–950 kr./m². Priserne er inkl. arbejde men ekskl. nedrivning og nye tagrender." },
    { q: "Hvad koster et nyt tag på en typisk villa?", a: "Et parcelhus med 150 m² tagareal lander typisk på 165.000–290.000 kr. inkl. nedrivning, undertag, nyt tag, tagrender og inddækninger." },
    { q: "Hvor lang holdbarhed har et nyt tag?", a: "Tegl: 80–120 år. Beton: 50–80 år. Stål: 40–50 år. Tagpap: 25–40 år. Skifer: 80–120 år." },
    { q: "Skal jeg have byggetilladelse til nyt tag?", a: "Nej, hvis du udskifter med samme materiale og bevarer tagform. Ja, hvis du ændrer tagform, hældning eller skifter mellem brandklasser. Tjek altid med din kommune." },
    { q: "Kan jeg trække tagudskiftning fra i skat?", a: "Selve materialerne kan ikke trækkes fra, men arbejdslønnen er omfattet af Håndværkerfradraget i 2026." },
    { q: "Hvor lang tid tager udskiftningen?", a: "Typisk 2–4 uger for et parcelhus afhængigt af vejr og tagets kompleksitet. Plus 1 uges varsel til stillads." },
  ],
  cta: {
    heading: "Klar til at indhente tagtilbud?",
    body: "Få op til 3 gratis tilbud fra verificerede tagdækkere og tømrere i dit område — så du kan sammenligne materialer, priser og garantier.",
    secondaryLabel: "Se tagdækkere & tømrere",
    secondaryHref: "/virksomheder?category=H%C3%A5ndv%C3%A6rker",
  },
});