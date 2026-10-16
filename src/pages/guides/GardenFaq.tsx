import { defineGuidePage } from "./defineGuidePage";

export default defineGuidePage({
  canonicalPath: "/guides/have/faq",
  metaTitle: "Havemand FAQ 2026: Pris, fradrag og hvad en havemand laver",
  metaDescription:
    "Svar på de mest stillede spørgsmål om havemand: timepris, græsslåning, hækklipning, haveaffald, servicefradrag, forsikring og faste aftaler. Få 3 gratis tilbud.",
  keywords: "havemand faq, havemand pris, hvad laver en havemand, havemand fradrag, gartner timepris, græsslåning pris, hækklipning pris",
  heroEyebrow: "FAQ · Have",
  heroTitle: "Havemand — ofte stillede spørgsmål",
  heroSubtitle:
    "Korte, konkrete svar om priser, fradrag, opgaver og aftaler, før du hyrer en havemand eller anlægsgartner.",
  breadcrumbLabel: "Havemand FAQ",
  ctaCategory: "Haveservice",
  publishedAt: "2026-10-08",
  updatedAt: "2026-10-08",
  quickFacts: [
    <>Timepris: <strong>400–700 kr./t</strong> inkl. moms</>,
    <>Græsslåning: <strong>250–900 kr./besøg</strong></>,
    <>Hækklipning: <strong>30–80 kr./lbm</strong></>,
    <>Servicefradrag på arbejdslønnen</>,
  ],
  priceTable: {
    headers: { label: "Opgave", price: "Typisk pris", note: "Afregning" },
    rows: [
      { label: "Havemand", price: "400–700 kr./t", note: "Timepris" },
      { label: "Græsslåning parcelhus", price: "250–900 kr.", note: "Pr. besøg" },
      { label: "Hækklipning", price: "30–80 kr.", note: "Pr. løbende meter" },
      { label: "Bortkørsel af haveaffald", price: "300–800 kr.", note: "Pr. læs" },
    ],
    footnote: "Vejledende priser inkl. moms. Den endelige pris afhænger af havens størrelse og adgangsforhold.",
  },
  sections: [
    { heading: "Sådan bruger du svarene", list: [
      <>Brug priserne som pejlemærke, og bed altid om en skriftlig pris før arbejdet starter.</>,
      <>Se den fulde prisguide under <a href="/priser/haveservice">havemand priser</a> og oversigten i <a href="/guides/have">haveguiden</a>.</>,
    ]},
  ],
  faq: [
    { q: "Hvad koster en havemand i timen?", a: "En havemand koster typisk 400–700 kr. i timen inkl. moms. Prisen afhænger af opgaven, udstyr og om du har en fast aftale." },
    { q: "Hvad laver en havemand?", a: "En havemand klarer løbende havearbejde som græsslåning, hækklipning, lugning, beskæring, løvopsamling, gødning og bortkørsel af haveaffald." },
    { q: "Hvad er forskellen på en havemand og en anlægsgartner?", a: "En havemand vedligeholder haven. En anlægsgartner anlægger nyt, fx terrasser, belægning, plæner og beplantning." },
    { q: "Kan jeg få fradrag for en havemand?", a: "Ja. Almindeligt havearbejde som græsslåning, hækklipning og lugning giver servicefradrag på arbejdslønnen. Materialer og kørsel giver ikke fradrag." },
    { q: "Hvad koster græsslåning?", a: "Græsslåning koster typisk 250–900 kr. pr. besøg for et parcelhus. Faste aftaler hver uge eller hver 14. dag giver ofte den laveste pris pr. besøg." },
    { q: "Hvad koster hækklipning?", a: "Hækklipning koster typisk 30–80 kr. pr. løbende meter. Høje, brede eller forsømte hække koster mere." },
    { q: "Hvor ofte skal græsset slås?", a: "I vækstsæsonen fra april til oktober bør græsset slås hver uge eller hver 14. dag." },
    { q: "Hvornår skal hækken klippes?", a: "De fleste hække klippes to gange om året: i juni og igen i august eller september." },
    { q: "Er bortkørsel af haveaffald med i prisen?", a: "Ikke altid. Spørg, om haveaffald er inkluderet, eller om det afregnes pr. læs." },
    { q: "Skal jeg være hjemme, når havemanden kommer?", a: "Nej, ikke hvis der er fri adgang til haven. Aftal adgang, port- eller dørkode og hvor affald må placeres." },
    { q: "Er en fast aftale billigere end enkeltbesøg?", a: "Ja, oftest. Faste aftaler er typisk 20–30 % billigere pr. besøg, fordi firmaet kan planlægge sine ruter." },
    { q: "Hvad sker der, hvis det regner?", a: "Ved kraftig regn flytter de fleste firmaer besøget til næste ledige dag. Spørg om firmaets vejrpolitik, når I laver aftalen." },
    { q: "Skal havemanden have forsikring?", a: "Vælg et firma med CVR-nummer og erhvervsansvarsforsikring, så eventuelle skader er dækket." },
    { q: "Hvordan finder jeg en god havemand?", a: "Sammenlign 2–3 tilbud, læs anmeldelser og vælg et lokalt firma med skriftlig pris. På Serviceydere kan du få op til 3 gratis tilbud." },
    { q: "Kan en havemand også rydde sne?", a: "Mange havefirmaer tilbyder snerydning og saltning om vinteren, ofte som sæsonabonnement." },
  ],
  cta: {
    heading: "Få 3 gratis tilbud på havemand",
    body: "Beskriv din have på et minut, og modtag uforpligtende tilbud fra lokale firmaer.",
    secondaryLabel: "Se havemand priser",
    secondaryHref: "/priser/haveservice",
  },
});
