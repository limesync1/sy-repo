import { defineGuidePage } from "./defineGuidePage";
import CityListSection from "@/components/content/CityListSection";
import { GARDEN_CITIES } from "@/pages/cities/gardenCityData";
import { GARDEN_GUIDE_META } from "./guidesRegistry";

export default defineGuidePage({
  canonicalPath: "/guides/have",
  metaTitle: GARDEN_GUIDE_META.title,
  metaDescription: GARDEN_GUIDE_META.desc,
  keywords: "gartner priser, gartner pris, havemand pris, haveservice priser, find anlægsgartner, find havehjælp, havehjælp pris, haveservice pris, havefirma, anlægsgartner, hækklipning pris, græsslåning pris, træfældning pris, snerydning pris",
  heroEyebrow: "Prisguide · Have",
  heroTitle: "Haveservice i 2026 — priser og valg af havefirma",
  heroSubtitle:
    "Hvad koster havehjælp, og skal du vælge en havemand eller anlægsgartner? Se vejledende gennemsnitsintervaller: 400–700 kr. i timen for en havemand, 250–900 kr. pr. græsslåning og 30–80 kr. pr. meter hækklipning. Guiden gennemgår også sæsonens opgaver, faste aftaler, haveaffald og valg af havefirma.",
  breadcrumbLabel: "Have",
  ctaCategory: "Haveservice",
  publishedAt: "2026-03-20",
  updatedAt: GARDEN_GUIDE_META.updatedAt,
  quickFacts: [
    <>Havemand timepris: <strong>400–700 kr./t</strong> inkl. moms</>,
    <>Græsslåning fast pris: <strong>250–900 kr./besøg</strong></>,
    <>Hækklipning: <strong>30–80 kr./lbm</strong></>,
    <>BoligJob-fradrag: ja, både service- og håndværkerdel</>,
  ],
  priceTable: {
    headers: { label: "Opgave", price: "Typisk pris", note: "Frekvens" },
    rows: [
      { label: "Græsslåning parcelhus", price: "250–900 kr.", note: "Ugentligt/14-dags" },
      { label: "Hækklipning pr. lbm", price: "30–80 kr.", note: "2× årligt" },
      { label: "Havemand timepris", price: "400–700 kr./t", note: "Efter behov" },
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
      <><strong>Græsslåning:</strong> 250–900 kr. pr. besøg for et almindeligt parcelhus — billigere med fast aftale.</>,
      <><strong>Hækklipning:</strong> 30–80 kr. pr. løbende meter afhængig af hækkens højde og tilstand.</>,
      <><strong>Beskæring af træer og buske:</strong> typisk 400–700 kr. i timen afhængig af sværhedsgrad.</>,
      <><strong>Træfældning:</strong> 2.500–8.500 kr. for mindre træer — større træer kræver altid et besøg først.</>,
      <><strong>Ny terrasse eller haveanlæg:</strong> 2.495–5.495 kr. pr. m² hos en anlægsgartner.</>,
      <><strong>Snerydning:</strong> 2.495–4.500 kr. for et sæsonabonnement på en almindelig indkørsel.</>,
    ]},
    { heading: "Havemand eller anlægsgartner — hvem skal du finde?", list: [
      <><strong>Havemand:</strong> løbende pleje som græsslåning, hækklipning, lugning og beskæring. Afregnes typisk pr. time eller som abonnement.</>,
      <><strong>Anlægsgartner:</strong> nye anlæg som terrasse, belægning, dræn, støttemure og større beplantning. Afregnes typisk med fast pris pr. opgave eller pr. m².</>,
      <><strong>Sådan finder du en anlægsgartner:</strong> beskriv opgaven med mål og gerne billeder, bed om en besigtigelse, og sammenlign 2–3 skriftlige tilbud med tidsplan og garanti.</>,
      <><strong>Kombinerede aftaler:</strong> mange firmaer tilbyder både pleje og anlæg, så du kan samle havens opgaver hos ét firma.</>,
    ]},
    { heading: "Haveservice i hele Danmark — lokale firmaer du kan stole på", list: [
      <>Alle havefirmaer på Serviceydere er CVR-registrerede og gennemgået, før de får adgang til opgaver.</>,
      <>Du kan læse ægte anmeldelser fra andre kunder, før du vælger — se bedømmelser direkte på firmaets profil.</>,
      <>Vi dækker hele landet: København, Aarhus, Odense, Aalborg og hundredvis af mindre byer med lokale havemænd og anlægsgartnere.</>,
      <>Få svar samme dag — de fleste firmaer svarer inden for få timer på hverdage.</>,
    ]},
    { heading: "Prisguides og opgaver", list: [
      <a href="/priser/haveservice">Gartner pris og havearbejde 2026</a>,
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
    { q: "Hvor finder jeg flere svar om havemand?", a: "Se vores samlede havemand FAQ på serviceydere.dk/guides/have/faq med svar om pris, fradrag, haveaffald og faste aftaler." },
    { q: "Hvad er gartner priser i 2026?", a: "En havemand/gartner koster typisk 400–700 kr. i timen inkl. moms. En anlægsgartner tager ofte 600–900 kr./t eller 2.495–5.495 kr. pr. m² for terrasse og belægning. Indhent 3 gratis tilbud for at sammenligne." },
    { q: "Skal jeg vælge abonnement eller engangsbesøg?", a: "Abonnement (typisk 18–24 besøg/år) er 20–30% billigere pr. besøg og giver fast personale. Engangsbesøg er bedst til specifikke opgaver." },
    { q: "Er haveservice BoligJob-fradragsberettiget?", a: "Ja — løbende haveservice falder under servicefradraget (12.300 kr./voksen). Anlæg af fx terrasse kan falde under håndværkerfradraget." },
    { q: "Hvornår skal jeg booke forårsopgaver?", a: "Marts-april. De bedste firmaer fyldes 3-4 uger frem i forårssæsonen." },
    { q: "Kan jeg kombinere have og snerydning?", a: "Ja — mange firmaer giver rabat på kombineret aftale. Særligt i Nordjylland, hvor vintersæsonen er lang." },
    { q: "Hvad koster græsslåning af en almindelig have?", a: "For et parcelhus på 200–400 m² græs koster græsslåning typisk 250–900 kr. pr. besøg inkl. afklip. Med fast aftale falder prisen ofte 20–30%." },
    { q: "Hvornår skal hækken klippes?", a: "Første klip i juni og andet i september-oktober. Hækklipning koster 30–80 kr. pr. løbende meter afhængig af højde og tilstand." },
  ],
  cta: {
    heading: "Find en havemand eller anlægsgartner",
    body: "Få 3 gratis tilbud på haveservice fra CVR-godkendte firmaer i dit område.",
    secondaryLabel: "Se haveservice priser",
    secondaryHref: "/priser/haveservice",
  },
});