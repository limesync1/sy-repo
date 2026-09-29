import { defineGuidePage } from "./defineGuidePage";
import CityListSection from "@/components/content/CityListSection";
import { GARDEN_CITIES } from "@/pages/cities/gardenCityData";

export default defineGuidePage({
  canonicalPath: "/guides/have",
  metaTitle: "Haveservice priser 2026: havemand fra 285 kr./t | Serviceydere",
  metaDescription:
    "Se hvad haveservice koster i 2026: græsslåning fra 245 kr., hækklipning fra 23 kr./m og havemand fra 285 kr./t. Sæsonplan, fradrag og 3 gratis tilbud.",
  keywords: "haveservice priser, haveservice pris, haveservice guide 2026, havemand pris, gartner pris, havefirma, anlægsgartner, hækklipning pris, græsslåning pris, træfældning pris, snerydning pris",
  heroEyebrow: "Hub · Have",
  heroTitle: "Haveservice i Danmark 2026 — komplet guide",
  heroSubtitle:
    "Fra græsslåning og hækklipning til store anlæg og snerydning — find pris, firma og guide til hver haveopgave.",
  breadcrumbLabel: "Have",
  ctaCategory: "Haveservice",
  publishedAt: "2027-03-20",
  quickFacts: [
    <>Havemand timepris: <strong>285–625 kr./t</strong> inkl. moms</>,
    <>Græsslåning fast pris: <strong>245–850 kr./besøg</strong></>,
    <>Hækklipning: <strong>23–85 kr./lbm</strong></>,
    <>BoligJob-fradrag: ja, både service- og håndværkerdel</>,
  ],
  priceTable: {
    headers: { label: "Opgave", price: "Typisk pris", note: "Frekvens" },
    rows: [
      { label: "Græsslåning parcelhus", price: "245–595 kr.", note: "Ugentligt/14-dags" },
      { label: "Hækklipning pr. lbm", price: "23–55 kr.", note: "2× årligt" },
      { label: "Havemand timepris", price: "285–625 kr./t", note: "Efter behov" },
      { label: "Træfældning (mindre)", price: "2.500–8.500 kr.", note: "Engangsopgave" },
      { label: "Anlægsgartner terrasse", price: "2.495–5.495 kr./m²", note: "Engangsopgave" },
      { label: "Snerydning sæsonabonnement", price: "2.495–4.500 kr.", note: "Vinter" },
    ],
    footnote: "Priser inkl. moms. BoligJob-fradrag reducerer reel udgift 26–37%.",
  },
  sections: [
    { heading: "Haveservice gennem året — hvad skal laves hvornår?", list: [
      <><strong>Forår (marts–maj):</strong> oprydning, første græsslåning, gødning og beskæring. Book 3–4 uger frem.</>,
      <><strong>Sommer (juni–august):</strong> græsslåning hver 1–2 uge, lugning og første hækklipning i juni.</>,
      <><strong>Efterår (september–november):</strong> anden hækklipning, løvopsamling og vinterklargøring.</>,
      <><strong>Vinter (december–februar):</strong> snerydning og saltning, gerne som sæsonabonnement.</>,
    ]},
    { heading: "Hvad påvirker prisen på haveservice?", list: [
      <>Havens størrelse og hvor tilgængelig den er for maskiner</>,
      <>Frekvens — faste abonnementer er typisk 20–30% billigere pr. besøg</>,
      <>Bortkørsel af haveaffald, som ofte afregnes separat</>,
      <>Om opgaven kræver specialudstyr, fx til træfældning eller stubfræsning</>,
    ]},
    { heading: "Sådan vælger du det rigtige havefirma", list: [
      <>Tjek at firmaet er CVR-registreret og har ansvarsforsikring — det er dit sikkerhedsnet, hvis noget går galt.</>,
      <>Få altid en skriftlig aftale med fast pris eller timepris, så du undgår overraskelser på fakturaen.</>,
      <>Spørg om haveaffald er inkluderet i prisen, eller om bortkørsel afregnes separat.</>,
      <>Sammenlign mindst 2–3 tilbud — priserne på samme opgave svinger ofte 30–50% mellem firmaer.</>,
      <>Vælg gerne et lokalt firma — kortere kørsel betyder ofte lavere pris og hurtigere udrykning.</>,
    ]},
    { heading: "Hvad koster de enkelte haveopgaver?", list: [
      <><strong>Græsslåning:</strong> 245–595 kr. pr. besøg for et almindeligt parcelhus — billigere med fast aftale.</>,
      <><strong>Hækklipning:</strong> 23–55 kr. pr. løbende meter afhængig af hækkens højde og tilstand.</>,
      <><strong>Beskæring af træer og buske:</strong> typisk 285–625 kr. i timen afhængig af sværhedsgrad.</>,
      <><strong>Træfældning:</strong> 2.500–8.500 kr. for mindre træer — større træer kræver altid et besøg først.</>,
      <><strong>Ny terrasse eller haveanlæg:</strong> 2.495–5.495 kr. pr. m² hos en anlægsgartner.</>,
      <><strong>Snerydning:</strong> 2.495–4.500 kr. for et sæsonabonnement på en almindelig indkørsel.</>,
    ]},
    { heading: "Prisguides og opgaver", list: [
      <a href="/priser/haveservice">Haveservice prisguide 2026</a>,
      <a href="/priser/anlaegsgartner">Anlægsgartner prisguide</a>,
      <a href="/blog/timepris-havemand-2026">Timepris havemand 2026</a>,
      <a href="/blog/haekklipning-pris-pr-meter-2026">Hækklipning pris pr. meter</a>,
      <a href="/blog/traefaeldning-pris-2026">Træfældning pris</a>,
      <a href="/blog/hvepseboet-fjernelse-pris-2026">Hvepseboet pris</a>,
      <a href="/blog/snerydning-pris-abonnement-2026">Snerydning pris og abonnement</a>,
    ]},
    { body: <CityListSection base="/haveservice" label="haveservice" cities={GARDEN_CITIES} /> },
    { heading: "Sammenligning og guides", list: [
      <a href="/blog/havemand-vs-anlaegsgartner">Havemand vs. anlægsgartner</a>,
      <a href="/blog/vinterklargoering-af-have">Vinterklargøring af haven</a>,
      <a href="/blog/algerens-paa-tag">Algerens på tag</a>,
      <a href="/priser/algebehandling">Algebehandling pris</a>,
    ]},
  ],
  faq: [
    { q: "Skal jeg vælge abonnement eller engangsbesøg?", a: "Abonnement (typisk 18–24 besøg/år) er 20–30% billigere pr. besøg og giver fast personale. Engangsbesøg er bedst til specifikke opgaver." },
    { q: "Er haveservice BoligJob-fradragsberettiget?", a: "Ja — løbende haveservice falder under servicefradraget (12.300 kr./voksen). Anlæg af fx terrasse kan falde under håndværkerfradraget." },
    { q: "Hvornår skal jeg booke forårsopgaver?", a: "Marts-april. De bedste firmaer fyldes 3-4 uger frem i forårssæsonen." },
    { q: "Kan jeg kombinere have og snerydning?", a: "Ja — mange firmaer giver rabat på kombineret aftale. Særligt i Nordjylland, hvor vintersæsonen er lang." },
  ],
  cta: {
    heading: "Find en havemand eller anlægsgartner",
    body: "Få 3 gratis tilbud på haveservice fra CVR-godkendte firmaer i dit område.",
    secondaryLabel: "Se haveservice priser",
    secondaryHref: "/priser/haveservice",
  },
});