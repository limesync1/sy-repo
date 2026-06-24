import { defineGuidePage } from "./defineGuidePage";

export default defineGuidePage({
  canonicalPath: "/guides/flytning",
  metaTitle: "Flytning 2026 — komplet guide til pris, planlægning og firmavalg | Serviceydere",
  metaDescription:
    "Alt om flytning samlet: priser pr. boligtype, tjekliste, bedste firma, opbevaring og lokalflytning vs. langflytning. Den ultimative reference for 2026.",
  keywords: "flytning guide 2026, flyttehjælp pris, flyttefirma, flytteplan, lokal flytning",
  heroEyebrow: "Hub · Flytning",
  heroTitle: "Flytning i Danmark 2026 — komplet guide",
  heroSubtitle:
    "Fra pris og tjekliste til firmavalg og opbevaring — alt du behøver vide før, under og efter flytningen, samlet ét sted.",
  breadcrumbLabel: "Flytning",
  ctaCategory: "Flyttehjælp",
  publishedAt: "2027-03-20",
  quickFacts: [
    <>Lejlighedsflytning 1-2 vær.: <strong>1.850–5.500 kr.</strong></>,
    <>Villaflytning 4-5 vær.: <strong>7.000–28.000 kr.</strong></>,
    <>Timepris 2 mand + bil: <strong>475–1.100 kr./t</strong></>,
    <>Dækning: <strong>20+ byer</strong> + langflytninger over hele DK</>,
  ],
  priceTable: {
    headers: { label: "Boligtype", price: "Typisk pris (lokal)", note: "Inkluderer" },
    rows: [
      { label: "Lille lejlighed 1-2 vær.", price: "1.850–4.500 kr.", note: "2 mand + bil, 3-5 t" },
      { label: "Mellem lejlighed 3 vær.", price: "3.500–6.500 kr.", note: "2 mand + bil, 5-7 t" },
      { label: "Rækkehus", price: "5.500–12.000 kr.", note: "3 mand + bil, 6-9 t" },
      { label: "Villa 4-5 vær.", price: "7.000–18.000 kr.", note: "3-4 mand + 2 bil" },
      { label: "Stor villa 150+ m²", price: "12.000–28.000 kr.", note: "4 mand + 2 bil" },
    ],
    footnote: "Priser ekskl. langtransport (typisk 8-15 kr./km over 50 km). Storbyflytninger kan ligge 15-25% højere.",
  },
  sections: [
    { heading: "Priser og dybtgående guides", list: [
      <a href="/priser/flyttehjaelp">Flyttehjælp prisguide 2026</a>,
      <a href="/blog/flytning-koebenhavn-pris-2026">Flytning København pris</a>,
      <a href="/blog/flytning-aarhus-pris-2026">Flytning Aarhus pris</a>,
      <a href="/blog/flytning-odense-pris-2026">Flytning Odense pris</a>,
      <a href="/blog/flytning-aalborg-pris-2026">Flytning Aalborg pris</a>,
      <a href="/blog/fraflytningsrengoering-pris-2026">Flytterengøring pris</a>,
    ]},
    { heading: "Lokal flyttehjælp — find firmaer", list: [
      <a href="/flyttehjaelp/koebenhavn">Flyttehjælp København</a>,
      <a href="/flyttehjaelp/aarhus">Flyttehjælp Aarhus</a>,
      <a href="/flyttehjaelp/odense">Flyttehjælp Odense</a>,
      <a href="/flyttehjaelp/aalborg">Flyttehjælp Aalborg</a>,
      <a href="/flyttehjaelp/esbjerg">Flyttehjælp Esbjerg</a>,
      <a href="/flyttehjaelp/horsens">Flyttehjælp Horsens</a>,
      <a href="/flyttehjaelp/roskilde">Flyttehjælp Roskilde</a>,
      <a href="/flyttehjaelp/helsingoer">Flyttehjælp Helsingør</a>,
      <a href="/flyttehjaelp/hilleroed">Flyttehjælp Hillerød</a>,
      <a href="/flyttehjaelp/silkeborg">Flyttehjælp Silkeborg</a>,
    ]},
    { heading: "Planlægning og valg", list: [
      <a href="/blog/tjekliste-til-flyttedag">Komplet flytte-tjekliste</a>,
      <a href="/blog/selvflytning-vs-flyttefirma">Selvflytning vs. flyttefirma</a>,
      <a href="/blog/billig-vs-dyr-flyttefirma">Billig vs. dyr flyttefirma</a>,
      <a href="/blog/serviceydere-vs-happyhelper">Serviceydere vs. Happyhelper</a>,
    ]},
  ],
  faq: [
    { q: "Hvor lang tid før skal jeg booke?", a: "I sommermånederne 4-6 uger frem. I efterår/vinter typisk 2-3 uger. På Serviceydere kan du dog ofte få akut hjælp inden for en uge." },
    { q: "Skal jeg vælge fast pris eller timepris?", a: "Lokal flytning under 5.000 kr.: timepris ok. Større/langture: altid fast pris med besigtigelse." },
    { q: "Er flyttehjælp BoligJob-fradragsberettiget?", a: "Selve transporten er ikke, men relaterede ydelser (flytterengøring, montering, nedrivning) er fradragsberettigede." },
    { q: "Hvad med forsikring?", a: "Alle CVR-firmaer på Serviceydere har lovpligtig ansvarsforsikring (min. 100.000 kr.). Spørg om fuld dækning for klaverer/kunst." },
  ],
  cta: {
    heading: "Klar til at flytte?",
    body: "Få 3 gratis flyttetilbud med fast pris fra forsikrede firmaer i dit område.",
    secondaryLabel: "Se flytte-tjekliste",
    secondaryHref: "/blog/tjekliste-til-flyttedag",
  },
});