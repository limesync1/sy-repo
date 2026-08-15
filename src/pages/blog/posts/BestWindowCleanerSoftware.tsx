import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "bedste-software-til-vinduespudsere-2026",
  keywords: "bedste software til vinduespudsere, program til vinduespudser, ruteplanlægning vinduespudsning, vinduespudser system 2026",
  faq: [
    { q: "Hvilke systemer findes der til vinduespudsere i Danmark?", a: "De mest omtalte er Serviceydere, SkvizBiz, Fenster og VinTrip. SkvizBiz og Serviceydere oplyser priser offentligt; de øvrige giver typisk pris på forespørgsel." },
    { q: "Hvad koster et program til vinduespudsere?", a: "Serviceydere koster 289 kr./md. med ruteplanlægning inkluderet plus 59 kr./md. pr. medarbejderlogin. SkvizBiz oplyser 100 kr./md. for en Lite-pakke og 399 kr./md. for den fulde version med gratis logins. Alle priser ekskl. moms." },
    { q: "Hvad er vigtigst at kigge efter?", a: "At planlægningen af den tilbagevendende rute er visuel og regner kørselstid med, at medarbejderne har en app, og at systemet ikke låser jer til kun at pudse vinduer." },
    { q: "Hvilket system skaffer nye kunder?", a: "Kun Serviceydere kombinerer driftssystemet med en markedsplads, hvor kunder selv finder og booker virksomheden." },
    { q: "Kan man prøve systemerne gratis?", a: "Serviceydere har 14 dages prøveperiode. SkvizBiz oplyser en gratis prøvemåned. Bed altid om at prøve med jeres egne kunder og en rigtig uge i kalenderen." },
  ],
  sections: [
    { heading: "Kort svar", paragraphs: [
      "Der er reelt fire navne i spil i Danmark: Serviceydere, SkvizBiz, Fenster og VinTrip. De tre sidste er bygget til vinduespudsning alene. Serviceydere er bygget til servicevirksomheder med kørende medarbejdere generelt og har både ruteplanlægning og en markedsplads, der giver nye kunder.",
      "Nedenfor er de fire holdt op mod hinanden på det, der faktisk afgør valget — og hvor de andre er stærke, skriver vi det.",
    ]},
    { heading: "Det du skal måle dem på", ordered: [
      "Ruteplanlægning: kan du se dagen visuelt, og regner systemet kørselstid og ankomsttid med?",
      "Faste aftaler: skriver systemet den tilbagevendende rute frem af sig selv?",
      "Medarbejder-app: har folk deres rute i lommen med tjek ind og ud?",
      "Fakturering og regnskab: ryger det udførte arbejde videre uden dobbeltindtastning?",
      "Låsning: hvad sker der den dag I også laver algebehandling, solceller eller rengøring?",
      "Nye kunder: skaffer systemet omsætning, eller administrerer det kun den I allerede har?",
      "Åbenhed om pris: kan du regne på det uden at booke et møde?",
    ]},
    { heading: "Serviceydere", paragraphs: [
      "Driftssystem og markedsplads i ét. Visuel ruteplanlægger med drag & drop, kørselstid og ETA, faste aftaler med automatisk fremskrivning, medarbejder-app med tjek ind og ud, online booking, prisberegner med frit definerbare enheder og integration til e-conomic og Dinero.",
      "289 kr./md. med ruteplanlægning inkluderet, 59 kr./md. pr. medarbejderlogin, 2.269 kr. i opstart, 14 dages prøveperiode. Svag side: bogføringen sker via integration frem for i selve programmet, og ved mange medarbejdere koster login-priserne.",
    ], list: [
      <a href="/software/vinduespudser">Serviceydere til vinduespudsere</a>,
      <a href="/software/priser">Priser</a>,
    ]},
    { heading: "SkvizBiz", paragraphs: [
      "Et veletableret program bygget specifikt til vinduespudsere, med kundestyring, planlægning, fakturering, betalingspåmindelser og bogføring i samme system. Registreret hos Erhvervsstyrelsen som godkendt standardbogføringssystem, og med offentlige priser: Lite fra 1.495 kr. i oprettelse og 100 kr./md., fuld version 3.495 kr. og 399 kr./md. Ekstra logins koster 0 kr., hvilket er en klar fordel for større hold. Til gengæld er det bundet til den ene branche, og flere funktioner ligger i moduler, der koster ekstra.",
    ], list: [<a href="/blog/serviceydere-vs-skvizbiz">Sammenlign Serviceydere og SkvizBiz</a>]},
    { heading: "Fenster", paragraphs: [
      "Dansk system målrettet vinduespudsere med planlægning, kundestyring og fakturering. Prisen oplyses ikke offentligt i samme grad, så du skal bede om et konkret tilbud for jeres antal medarbejdere for at kunne sammenligne.",
    ], list: [<a href="/blog/serviceydere-vs-fenster">Sammenlign Serviceydere og Fenster</a>]},
    { heading: "VinTrip", paragraphs: [
      "Dansk program til vinduespudsere med fokus på turen, kunderne og faktureringen. Også her bør du bede om en samlet månedspris inklusive alle moduler, før du sammenligner.",
    ], list: [<a href="/blog/serviceydere-vs-vintrip">Sammenlign Serviceydere og VinTrip</a>]},
    { heading: "Sådan vælger du", list: [
      "Er I mange medarbejdere og laver udelukkende vinduer, og vil have bogføringen i samme program: SkvizBiz er værd at regne på.",
      "Er ruteplanlægningen jeres flaskehals, laver I flere ydelser, eller mangler I nye kunder: Serviceydere.",
      "Uanset hvad: prøv begge med jeres egne kunder i en rigtig uge, og få den fulde pris på skrift inklusive opstart.",
    ]},
    { heading: "Læs også", list: [
      <a href="/blog/bedste-system-til-servicevirksomheder-2026">Bedste system til servicevirksomheder 2026</a>,
      <a href="/software/ruteplanlaegger">Sådan virker ruteplanlæggeren</a>,
      <a href="/software/brancher">Brancher systemet dækker</a>,
    ]},
  ],
});
export default Post;