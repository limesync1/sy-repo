import { defineGuidePage } from "./defineGuidePage";

export default defineGuidePage({
  canonicalPath: "/guides/priser-2026",
  metaTitle: "Priser 2026 — komplet oversigt over alle serviceydelser i Danmark | Serviceydere",
  metaDescription:
    "Master-indeks over alle priser i 2026: rengøring, flytning, håndværker, have, VVS, el og specialopgaver. Den ultimative reference med 50+ prisguides.",
  keywords: "priser 2026, serviceydelser pris danmark, prisguide alle brancher, hvad koster",
  heroEyebrow: "Hub · Master prisindeks",
  heroTitle: "Priser i Danmark 2026 — den komplette oversigt",
  heroSubtitle:
    "Alle vores prisguides samlet ét sted. Find realistiske 2026-priser for rengøring, flytning, håndværk, have og alle andre serviceydelser.",
  breadcrumbLabel: "Priser 2026",
  publishedAt: "2027-03-20",
  quickFacts: [
    <>Dækning: <strong>50+ prisguides</strong> for alle hovedfag</>,
    <>Opdateret: <strong>2026-priser</strong> inkl. moms og fradrag</>,
    <>Sammenligning: <strong>20+ byer</strong> over hele Danmark</>,
    <>Fradrag: <strong>BoligJob 2026</strong> integreret i alle priser</>,
  ],
  priceTable: {
    headers: { label: "Kategori", price: "Typisk pris", note: "Detaljer" },
    rows: [
      { label: "Rengøring", price: "225–450 kr./t", note: "Se rengøringshub" },
      { label: "Flytning", price: "1.850–28.000 kr.", note: "Pr. boligtype" },
      { label: "Håndværker", price: "365–950 kr./t", note: "Pr. fag" },
      { label: "Haveservice", price: "285–625 kr./t", note: "Pr. opgave" },
      { label: "VVS akut", price: "595–1.495 kr.", note: "Udkald" },
      { label: "Elektriker", price: "465–895 kr./t", note: "Inkl. udkald" },
    ],
    footnote: "Klik ind på den enkelte kategori for fuld pris-tabel og lokale variationer.",
  },
  sections: [
    { heading: "Hovedkategorier (hubs)", list: [
      <a href="/guides/rengoering">Rengøring — komplet hub</a>,
      <a href="/guides/flytning">Flytning — komplet hub</a>,
      <a href="/guides/haandvaerker">Håndværker — komplet hub</a>,
      <a href="/guides/have">Have & haveservice — komplet hub</a>,
    ]},
    { heading: "Rengøring & service", list: [
      <a href="/priser/rengoering">Rengøring</a>,
      <a href="/priser/vinduespudser">Vinduespudser</a>,
      <a href="/blog/hovedrengoering-pris-pr-m2-2026">Hovedrengøring m²</a>,
      <a href="/blog/erhvervsrengoering-pris-pr-m2-2026">Erhvervsrengøring</a>,
      <a href="/blog/fraflytningsrengoering-pris-2026">Flytterengøring</a>,
      <a href="/blog/vinduespudser-villa-pris-2026">Vinduespudser villa</a>,
    ]},
    { heading: "Flytning", list: [
      <a href="/priser/flyttehjaelp">Flyttehjælp</a>,
      <a href="/blog/flytning-koebenhavn-pris-2026">Flytning København</a>,
      <a href="/blog/flytning-aarhus-pris-2026">Flytning Aarhus</a>,
      <a href="/blog/flytning-odense-pris-2026">Flytning Odense</a>,
      <a href="/blog/flytning-aalborg-pris-2026">Flytning Aalborg</a>,
    ]},
    { heading: "Håndværk", list: [
      <a href="/priser/haandvaerker">Håndværker (alm.)</a>,
      <a href="/priser/tomrer">Tømrer</a>,
      <a href="/priser/murer">Murer</a>,
      <a href="/priser/elektriker">Elektriker</a>,
      <a href="/priser/vvs">VVS</a>,
      <a href="/priser/maler">Maler</a>,
      <a href="/priser/gulvlaegger">Gulvlægger</a>,
    ]},
    { heading: "Større renoveringer", list: [
      <a href="/priser/nyt-tag">Nyt tag</a>,
      <a href="/priser/nyt-badevaerelse">Nyt badeværelse</a>,
      <a href="/priser/vinduesudskiftning">Nye vinduer</a>,
      <a href="/priser/kloakmester">Kloakmester</a>,
      <a href="/priser/varmepumpe">Varmepumpe</a>,
      <a href="/blog/isolering-pris-2026">Isolering</a>,
      <a href="/blog/asbestnedrivning-pris-2026">Asbestnedrivning</a>,
    ]},
    { heading: "Have & udendørs", list: [
      <a href="/priser/haveservice">Haveservice</a>,
      <a href="/priser/anlaegsgartner">Anlægsgartner</a>,
      <a href="/priser/algebehandling">Algebehandling</a>,
      <a href="/blog/snerydning-pris-abonnement-2026">Snerydning</a>,
      <a href="/blog/hegn-opstilling-pris-pr-meter-2026">Hegn opstilling</a>,
      <a href="/blog/terrasse-traedaek-pris-2026">Trædæk terrasse</a>,
    ]},
    { heading: "Specialfag", list: [
      <a href="/priser/skorstensfejer">Skorstensfejer</a>,
      <a href="/priser/skadedyr">Skadedyrsbekæmpelse</a>,
      <a href="/priser/sikkerhed">Alarm & sikkerhed</a>,
      <a href="/blog/laasesmed-oplukning-pris-2026">Låsesmed opklukning</a>,
    ]},
    { heading: "Fradrag", list: [
      <a href="/guides/haandvaerkerfradrag-2026">Håndværkerfradrag 2026</a>,
      <a href="/guides/servicefradrag-2026">Servicefradrag 2026</a>,
    ]},
  ],
  faq: [
    { q: "Hvor opdaterede er priserne?", a: "Alle prisguides er opdateret for 2026. Priserne er sammensat af officielle branchedata, prisstatistik fra forbrugerorganisationer og indhentede tilbud fra danske CVR-godkendte firmaer." },
    { q: "Inkluderer priserne moms?", a: "Ja — alle priser er angivet inkl. moms. BoligJob-fradraget reducerer reel udgift med 26–37%." },
    { q: "Hvorfor varierer priserne så meget?", a: "Geografi (KBH højest), opgavens størrelse, tidspunkt (akut dyrere) og firma-niveau (premium vs. standard). Hver guide forklarer den lokale variation." },
    { q: "Hvordan får jeg den bedste pris?", a: "Indhent 3–5 tilbud, sammenlign efter fradrag, og vælg fast pris frem for timepris på veldefinerede opgaver." },
  ],
  cta: {
    heading: "Find priser og firmaer til din opgave",
    body: "Få 3 gratis tilbud fra CVR-godkendte firmaer — uanset om det er rengøring, flytning eller renovering.",
    secondaryLabel: "Se alle prisguides",
    secondaryHref: "/guides",
  },
});