import { defineGuidePage } from "./defineGuidePage";

export default defineGuidePage({
  canonicalPath: "/priser/skadedyr",
  metaTitle: "Skadedyrsbekæmpelse pris 2026 — rotter, mus, hvepse | Serviceydere",
  metaDescription:
    "Hvad koster skadedyrsbekæmpelse i 2026? Rotter, mus, hvepse, sølvfisk og bænkebider — priser, anmeldelsespligt og hvad forsikringen dækker.",
  keywords: "skadedyrsbekæmpelse pris, rotter pris, hvepse pris, museplage, sølvfisk bekæmpelse",
  heroEyebrow: "Prisguide · Opdateret juli 2026",
  heroTitle: "Hvad koster skadedyrsbekæmpelse i 2026?",
  heroSubtitle:
    "Rotter, mus, hvepse, sølvfisk og bænkebider — hvad koster bekæmpelsen, og hvornår er det gratis via kommunen?",
  breadcrumbLabel: "Skadedyrsbekæmpelse",
  ctaCategory: "Skadedyrsbekæmpelse",
  publishedAt: "2026-07-20",
  quickFacts: [
    <>Rotter via kommunen: <strong>gratis</strong> (anmeldelsespligt)</>,
    <>Privat akutudkald: <strong>1.500–3.500 kr.</strong></>,
    <>Hvepsebo: <strong>700–1.500 kr.</strong> for fjernelse</>,
    <>Mange forsikringer dækker — tjek policen først</>,
  ],
  priceTable: {
    rows: [
      { label: "Rotter (kommunen)", price: "Gratis", note: "Anmeldelsespligt" },
      { label: "Rotter (privat)", price: "1.500–3.500 kr.", note: "Akut + opfølgning" },
      { label: "Mus i loftet", price: "1.200–2.800 kr.", note: "Inkl. fælder/gift" },
      { label: "Hvepsebo (udendørs)", price: "700–1.500 kr.", note: "Pr. bo" },
      { label: "Sølvfisk/bænkebider", price: "1.500–3.500 kr.", note: "Inkl. opfølgning" },
      { label: "Borebiller/møl", price: "3.500–8.000 kr.", note: "Behandling + insp." },
    ],
    footnote: "Vejledende priser inkl. moms. Mange forsikringer dækker bekæmpelse — tjek altid din police.",
  },
  sections: [
    {
      heading: "Symptomer — hvad har du?",
      list: [
        <><strong>Rotter:</strong> sorte ekskrementer (15–20 mm), gnavspor, lugt af ammoniak, huller i jorden 5–10 cm.</>,
        <><strong>Mus:</strong> små runde ekskrementer, gnavspor på madvarer, lyde i loftet om natten.</>,
        <><strong>Hvepse:</strong> hvepse der konsekvent flyver til samme sted; bo i loft, skur eller havemur.</>,
        <><strong>Sølvfisk:</strong> sølvgrå, hurtige insekter på badeværelse og køkken — tegn på fugt.</>,
        <><strong>Bænkebider:</strong> grå/lyserøde insekter i fugtige hjørner og under planter.</>,
      ],
    },
    {
      heading: "Rotter — du skal anmelde",
      paragraphs: [
        "Du har anmeldelsespligt for rotter. Anmeld via kommunens hjemmeside eller borger.dk — kommunen sender autoriseret bekæmper inden for få dage, og det er gratis.",
        "Privat firma er kun nødvendigt hvis kommunens bekæmpelse trækker ud, eller hvis du har akut behov uden for åbningstid.",
      ],
    },
    {
      heading: "Tjek forsikringen først",
      paragraphs: [
        "Mange husforsikringer indeholder skadedyrsdækning — bekæmpelsen er så gratis bortset fra evt. selvrisiko. Ring til selskabet før du bestiller privat firma.",
      ],
    },
    {
      heading: "Forebyggelse",
      list: [
        "Luk skraldespand med fast låg, hold låg på kompost.",
        "Fjern fuglefoder fra jorden — kun foderhuse hængt > 1 m op.",
        "Lap revner i fundament; rottespærre i kloak ved gentagne problemer.",
        "Affugt fugtige rum — sølvfisk og bænkebider trives kun i fugt.",
      ],
    },
  ],
  faq: [
    { q: "Skal jeg anmelde rotter?", a: "Ja — du har pligt til at anmelde rotter til kommunen. Anmeldelse og bekæmpelse er gratis." },
    { q: "Dækker forsikringen skadedyr?", a: "Mange husforsikringer dækker bekæmpelse af rotter, mus, hvepse og insekter. Tjek policen — ofte med begrænset selvrisiko." },
    { q: "Kan jeg selv slå et hvepsebo?", a: "Små bo i jorden eller en busk kan håndteres med spraydåse fra byggemarkedet, helst i skumring. Bo i loft, skorsten eller mur bør altid håndteres af professionel — risiko for stik og brand." },
    { q: "Hvor hurtigt rykker en skadedyrsbekæmper ud?", a: "Akut udkald typisk inden for 4–24 timer. Mindre opgaver (mus, sølvfisk) inden for 1–3 hverdage." },
  ],
  cta: {
    heading: "Klar til at få skadedyrene væk?",
    body: "Få op til 3 gratis tilbud fra autoriserede skadedyrsbekæmpere — eller anmeld rotter direkte til kommunen.",
    secondaryLabel: "Se skadedyrsbekæmpere",
    secondaryHref: "/virksomheder?category=Skadedyrsbek%C3%A6mpelse",
  },
});