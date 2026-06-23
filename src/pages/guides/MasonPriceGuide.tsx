import { defineGuidePage } from "./defineGuidePage";

export default defineGuidePage({
  canonicalPath: "/priser/murer",
  metaTitle: "Murer pris 2026 — timepris, opmuring & omfugning | Serviceydere",
  metaDescription:
    "Hvad koster en murer i 2026? Timepris, opmuring, omfugning, sætningsskader og facaderens — komplet prisguide med eksempler.",
  keywords: "murer pris, murer timepris, opmuring pris, omfugning pris, sætningsskade pris",
  heroEyebrow: "Prisguide · Opdateret juni 2026",
  heroTitle: "Hvad koster en murer i 2026?",
  heroSubtitle:
    "Timepris, opmuring, omfugning, sætningsrevner og facaderens — alt det du har brug for at vide før du henter tilbud på murerarbejde.",
  breadcrumbLabel: "Murer",
  ctaCategory: "Murer",
  publishedAt: "2026-07-16",
  quickFacts: [
    <>Timepris: <strong>475–625 kr.</strong> inkl. moms</>,
    <>Omfugning facade (100 m²): <strong>35.000–60.000 kr.</strong></>,
    <>Mindre revneudbedring: <strong>3.000–8.000 kr.</strong></>,
    <>Sætningsskade m. fundament: <strong>50.000–200.000+ kr.</strong></>,
  ],
  priceTable: {
    rows: [
      { label: "Murer timepris", price: "475–625 kr./t", note: "Inkl. moms" },
      { label: "Mindre revneudbedring", price: "3.000–8.000 kr.", note: "Pr. opgave" },
      { label: "Omfugning facade", price: "350–600 kr./m²", note: "Inkl. stillads" },
      { label: "Opmuring (skillevæg)", price: "1.200–1.800 kr./m²", note: "Inkl. materialer" },
      { label: "Pudsning af facade", price: "450–750 kr./m²", note: "Inkl. spartling" },
      { label: "Sætningsudbedring", price: "50.000–200.000 kr.", note: "Afhænger af omfang" },
    ],
    footnote: "Vejledende priser inkl. moms. Opdateret 2026.",
  },
  sections: [
    {
      heading: "Vurder revnen før du ringer",
      paragraphs: [
        "Tynde lodrette hårrevner (< 1 mm) er ofte kosmetiske. Vandrette revner, revner > 2 mm og trappetrinsrevner i hjørner kan indikere bevægelse i fundamentet og bør altid vurderes.",
        "Tegn en streg på tværs af revnen og noter datoen. Mål bredden igen efter 4 og 12 uger. Hvis revnen vokser, ring til murer eller byggesagkyndig hurtigt.",
      ],
    },
    {
      heading: "Process for større opgaver",
      ordered: [
        "Forhåndsbesøg og opmåling.",
        "Skriftligt tilbud med opdelt pris (løn, materialer, stillads).",
        "Aftal AB-Forbruger på opgaver > 30.000 kr.",
        "Udførelse — typisk 1–6 uger afhængig af størrelse.",
        "Afleveringsforretning og mangelliste.",
      ],
    },
    {
      heading: "Fugtskader — udbedre hurtigt",
      paragraphs: [
        "Mørke pletter, hvide saltudblomstringer eller smuldrende fuger nederst på facaden tyder på opstigende fugt. Det skal udbedres hurtigt — fugt der får lov at sive ind giver skimmel og svækker murværket.",
      ],
    },
    {
      heading: "Sådan får du den bedste pris",
      list: [
        <>Få <strong>2–3 tilbud</strong> baseret på samme detaljerede beskrivelse.</>,
        <>Bed om <strong>opmåling på stedet</strong> — telefontilbud er upålidelige.</>,
        <>Tjek <strong>medlemskab af Danske Murermestre</strong> for ekstra tryghed.</>,
        <>Aftal <strong>5 års garanti</strong> via AB-Forbruger.</>,
      ],
    },
  ],
  faq: [
    { q: "Hvad koster en murer i timen?", a: "Faglært murer koster typisk 475–625 kr. pr. time inkl. moms i 2026." },
    { q: "Dækker forsikringen revner i muren?", a: "Pludselige sætningsskader fra fx kloakkollaps kan være dækket. Almindelige sætninger over tid er normalt ikke dækket — handl hurtigt og dokumentér udviklingen." },
    { q: "Kan jeg trække murerarbejde fra?", a: "Almindelig vedligehold som omfugning, revneudbedring og pudsning er omfattet af BoligJob-ordningen. Nybyg og tilbygninger er ikke." },
    { q: "Hvor lang tid tager en facadeomfugning?", a: "Et standard parcelhus tager typisk 2–4 uger inkl. stillads. Vejret afgør meget — frost og kraftig regn stopper arbejdet." },
  ],
  cta: {
    heading: "Klar til at indhente murertilbud?",
    body: "Få op til 3 gratis, uforpligtende tilbud fra verificerede murere i dit område.",
    secondaryLabel: "Se murere",
    secondaryHref: "/virksomheder?category=Murer",
  },
});