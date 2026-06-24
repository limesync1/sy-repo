import { defineGuidePage } from "./defineGuidePage";

export default defineGuidePage({
  canonicalPath: "/guides/have",
  metaTitle: "Have & haveservice 2026 — komplet guide til priser og firmaer | Serviceydere",
  metaDescription:
    "Alt om haveservice: priser, abonnement, hækklipning, anlæg af terrasse, snerydning og lokal hjælp i hele Danmark. Den ultimative haveguide for 2026.",
  keywords: "haveservice guide 2026, havemand pris, anlægsgartner, hækklipning, græsslåning",
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
    { heading: "Prisguides og opgaver", list: [
      <a href="/priser/haveservice">Haveservice prisguide 2026</a>,
      <a href="/priser/anlaegsgartner">Anlægsgartner prisguide</a>,
      <a href="/blog/timepris-havemand-2026">Timepris havemand 2026</a>,
      <a href="/blog/haekklipning-pris-pr-meter-2026">Hækklipning pris pr. meter</a>,
      <a href="/blog/traefaeldning-pris-2026">Træfældning pris</a>,
      <a href="/blog/hvepseboet-fjernelse-pris-2026">Hvepseboet pris</a>,
      <a href="/blog/snerydning-pris-abonnement-2026">Snerydning pris og abonnement</a>,
    ]},
    { heading: "Lokal haveservice — find firmaer", list: [
      <a href="/haveservice/koebenhavn">Haveservice København</a>,
      <a href="/haveservice/aarhus">Haveservice Aarhus</a>,
      <a href="/haveservice/odense">Haveservice Odense</a>,
      <a href="/haveservice/aalborg">Haveservice Aalborg</a>,
      <a href="/haveservice/esbjerg">Haveservice Esbjerg</a>,
      <a href="/haveservice/horsens">Haveservice Horsens</a>,
      <a href="/haveservice/silkeborg">Haveservice Silkeborg</a>,
      <a href="/haveservice/frederiksberg">Haveservice Frederiksberg</a>,
      <a href="/blog/gartner-koebenhavn-timepris-2026">Gartner pris København</a>,
      <a href="/blog/gartner-aarhus-pris-2026">Gartner pris Aarhus</a>,
    ]},
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