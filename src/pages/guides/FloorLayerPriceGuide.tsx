import { defineGuidePage } from "./defineGuidePage";

export default defineGuidePage({
  canonicalPath: "/priser/gulvlaegger",
  metaTitle: "Gulvlægger pris 2026 — vinyl, laminat, trægulv & fliser | Serviceydere",
  metaDescription:
    "Hvad koster en gulvlægger i 2026? Pris pr. m² for vinyl, laminat, trægulv, parket og fliser — inkl. afretning og fodlister.",
  keywords: "gulvlægger pris, lægning af laminat pris, trægulv pris pr m2, vinyl pris, gulvfliser pris",
  heroEyebrow: "Prisguide · Opdateret juli 2026",
  heroTitle: "Hvad koster en gulvlægger i 2026?",
  heroSubtitle:
    "Pris pr. m² på lægning af vinyl, laminat, trægulv, parket og fliser — plus realistiske totalpriser for typiske rum.",
  breadcrumbLabel: "Gulvlægger",
  ctaCategory: "Gulvlægger",
  publishedAt: "2026-07-24",
  quickFacts: [
    <>Klikgulv (laminat/vinyl): <strong>175–300 kr./m²</strong> lægning</>,
    <>Massivt trægulv: <strong>350–650 kr./m²</strong> lægning</>,
    <>Fliser: <strong>600–1.200 kr./m²</strong> lægning</>,
    <>Afretning af ujævnt gulv: <strong>150–300 kr./m²</strong></>,
  ],
  priceTable: {
    rows: [
      { label: "Laminat lægning", price: "175–250 kr./m²", note: "Klikgulv" },
      { label: "Vinyl (LVT/SPC) lægning", price: "200–300 kr./m²", note: "Klik eller lim" },
      { label: "Massivt trægulv", price: "350–650 kr./m²", note: "Søm eller lim" },
      { label: "Lamelparket", price: "275–450 kr./m²", note: "Klik" },
      { label: "Fliser i bryggers", price: "600–950 kr./m²", note: "Inkl. fuger" },
      { label: "Fliser i badeværelse", price: "850–1.400 kr./m²", note: "Vådrumssikret" },
      { label: "Afretning af ujævnt gulv", price: "150–300 kr./m²", note: "Selvnivellerende" },
      { label: "Demontering af gl. gulv", price: "75–150 kr./m²", note: "+ bortskaffelse" },
    ],
    footnote: "Vejledende lægningspriser inkl. moms. Selve gulvet kommer oveni.",
  },
  sections: [
    {
      heading: "Hvad koster gulvet ekstra?",
      list: [
        <><strong>Laminat:</strong> 150–400 kr./m² for selve gulvet.</>,
        <><strong>Vinyl (LVT/SPC):</strong> 250–600 kr./m².</>,
        <><strong>Lamelparket:</strong> 350–800 kr./m².</>,
        <><strong>Massivt trægulv:</strong> 600–1.500 kr./m².</>,
        <><strong>Fliser:</strong> 300–1.200 kr./m².</>,
      ],
    },
    {
      heading: "Sådan vælger du det rette gulv",
      paragraphs: [
        "Tre ting afgør valget: hvor meget slid får gulvet, er der risiko for vand, og hvad synes du om udseendet under fødderne.",
        "Vinyl er det mest alsidige valg i 2026 — vandtæt, varmt og dæmper lyd. Massivt trægulv er smukkest og holder længst, men er dyrere og kræver pleje. Fliser er mest holdbare i bryggers, badeværelse og rum med gulvvarme.",
      ],
    },
    {
      heading: "Tjekliste før gulvlæggeren kommer",
      ordered: [
        "Opmål rummet og tilføj 10% spild.",
        "Tjek underlaget — krummer kræver afretning (typisk +150–300 kr./m²).",
        "Beslut afslutning ved døre, paneler og overgange.",
        "Få skriftligt tilbud med materialer, lægning og oprydning.",
        "Aftal 5 års garanti på selve lægningen.",
      ],
    },
  ],
  faq: [
    { q: "Hvad koster det at få lagt et nyt gulv i et soveværelse på 15 m²?", a: "Med laminat: 2.250–5.250 kr. inkl. materialer og lægning. Med vinyl: 3.750–9.000 kr. Med massivt trægulv: 11.250–22.500 kr." },
    { q: "Hvad holder længst?", a: "Massivt trægulv holder 50–100 år og kan slibes flere gange. Laminat holder 15–25 år (kan ikke slibes), vinyl 20–30 år, fliser 50+ år." },
    { q: "Kan jeg lægge gulv selv?", a: "Klikgulv (laminat, vinyl) kan godt lægges af handy gør-det-selv-folk. Massivt trægulv, parket og fliser bør altid lægges af fagmand for at få garanti og pænt resultat." },
    { q: "Er gulvlægger fradragsberettiget?", a: "Almindelig udskiftning og reparation af gulve er omfattet af BoligJob-ordningen. Lægning i forbindelse med nybyg eller tilbygning er ikke." },
  ],
  cta: {
    heading: "Klar til at indhente gulv-tilbud?",
    body: "Få op til 3 gratis tilbud fra gulvlæggere i dit område — sammenlign pris, materialer og leveringstid.",
    secondaryLabel: "Se gulvlæggere",
    secondaryHref: "/virksomheder?category=Gulvl%C3%A6gger",
  },
});