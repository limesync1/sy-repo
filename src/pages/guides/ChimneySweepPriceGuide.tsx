import { defineGuidePage } from "./defineGuidePage";

export default defineGuidePage({
  canonicalPath: "/priser/skorstensfejer",
  metaTitle: "Skorstensfejer pris 2026 — fejning, gebyr & inspektion | Serviceydere",
  metaDescription:
    "Hvad koster en skorstensfejer i 2026? Lovpligtig fejning, gebyrer, brændeovnsinspektion og kontrol af gasfyr — komplet prisoversigt.",
  keywords: "skorstensfejer pris, skorstensfejergebyr, brændeovn fejning pris, lovpligtig fejning, sotbrand",
  heroEyebrow: "Prisguide · Opdateret juli 2026",
  heroTitle: "Hvad koster en skorstensfejer i 2026?",
  heroSubtitle:
    "Lovpligtig fejning, gebyr, brændeovnsinspektion og kontrol af gasfyr — hvad du skal betale, og hvad du får for pengene.",
  breadcrumbLabel: "Skorstensfejer",
  ctaCategory: "Skorstensfejer",
  publishedAt: "2026-07-30",
  quickFacts: [
    <>Årlig fejning (brændeovn): <strong>350–650 kr.</strong> inkl. gebyr</>,
    <>Pejs eller åben brændeovn: <strong>2 fejninger/år</strong></>,
    <>Gasfyr-kontrol: <strong>450–800 kr.</strong></>,
    <>Sotbrandinspektion: <strong>700–1.500 kr.</strong></>,
  ],
  priceTable: {
    rows: [
      { label: "Brændeovn fejning (1×/år)", price: "350–650 kr.", note: "Inkl. gebyr" },
      { label: "Pejs/åben ovn (2×/år)", price: "650–1.100 kr.", note: "Lovpligtigt" },
      { label: "Pillefyr inspektion", price: "550–900 kr.", note: "Pr. besøg" },
      { label: "Gasfyr-kontrol", price: "450–800 kr.", note: "Anbefales årligt" },
      { label: "Sotbrandinspektion", price: "700–1.500 kr.", note: "Efter brand" },
      { label: "Ny skorsten (godkendelse)", price: "1.200–2.500 kr.", note: "Måling + attest" },
    ],
    footnote: "Fejergebyret opkræves typisk via kommunens ejendomsskat. Priser inkl. moms.",
  },
  sections: [
    {
      heading: "Lovpligtig fejning — hvor ofte?",
      list: [
        "Brændeovn med lukket ildsted: 1 gang om året.",
        "Pejs eller åben brændeovn: 2 gange om året.",
        "Pillefyr: efter producentens anbefaling, typisk 1–2 gange årligt.",
        "Olie- og gaskedler: 1 gang om året.",
      ],
    },
    {
      heading: "Hvordan opkræves gebyret?",
      paragraphs: [
        "I langt de fleste kommuner opkræves skorstensfejergebyret automatisk via ejendomsskatten. Du behøver typisk ikke booke aktivt — skorstensfejeren kommer ved et fast årligt besøg og lægger en seddel, hvis du ikke var hjemme.",
        "Bor du i en kommune med fri leverandørvalg, kan du selv vælge en autoriseret skorstensfejer i området.",
      ],
    },
    {
      heading: "Sådan forbereder du besøget",
      ordered: [
        "Sørg for at brændeovnen er kold — gerne mindst 12 timer uden fyring.",
        "Læg avispapir eller plastik ud foran ovnen til soden.",
        "Tag kæledyr ud af rummet — fejning støjer.",
        "Vis vej til loftslem hvis skorstenen skal renses oppefra.",
      ],
    },
    {
      heading: "Røde flag",
      list: [
        "Skorstensfejeren vil sælge dig dyre 'sotforebyggende' midler — ofte unødvendigt.",
        "Tilbyder kun fejning uden gebyr-faktura — du mister forsikringsdokumentation.",
        "Hopper en lovpligtig fejning over — du risikerer bøde og mister forsikring ved skorstensbrand.",
      ],
    },
  ],
  faq: [
    { q: "Hvad sker der hvis jeg ikke får fejet?", a: "Du risikerer bøde og — vigtigere — at husforsikringen afviser dækning ved skorstensbrand. Lovpligtig fejning er en betingelse i de fleste forsikringspolicer." },
    { q: "Kan jeg selv feje skorstenen?", a: "Nej — fejning og inspektion skal udføres af autoriseret skorstensfejer. Selv hvis du gjorde det selv, ville forsikringen ikke acceptere det som lovlig fejning." },
    { q: "Skal nye brændeovne også feges hvert år?", a: "Ja. Selv en helt ny ovn skal feges efter de lovpligtige intervaller fra første fyringssæson." },
    { q: "Hvad koster det at få godkendt en ny skorsten?", a: "Måling, fugtighedstest og attest koster typisk 1.200–2.500 kr. Selve installation af skorstenen kommer oveni." },
  ],
  cta: {
    heading: "Brug for inspektion eller akut hjælp?",
    body: "Få op til 3 gratis tilbud fra autoriserede skorstensfejere — eller vent på dit lovpligtige årsbesøg.",
    secondaryLabel: "Se skorstensfejere",
    secondaryHref: "/virksomheder?category=Skorstensfejer",
  },
});