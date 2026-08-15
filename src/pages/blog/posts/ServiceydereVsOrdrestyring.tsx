import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "serviceydere-vs-ordrestyring",
  keywords: "ordrestyring, ordrestyringssystem, serviceydere alternativ, planlægning servicevirksomhed",
  faq: [
    { q: "Hvad er et ordrestyringssystem?", a: "Et ordrestyringssystem holder styr på ordrer fra bestilling til faktura: hvem har bestilt hvad, hvem skal udføre det, og hvad skal der faktureres." },
    { q: "Er ruteplanlægning det samme?", a: "Nej. Ordrestyring svarer på hvad der skal laves. Ruteplanlægning svarer på hvornår og i hvilken rækkefølge det kan nås, når der er kørsel imellem." },
    { q: "Hvornår er ren ordrestyring nok?", a: "Når opgaverne er få og lange, eller når medarbejderne arbejder samme sted hele dagen. Så er rækkefølgen ikke det, der koster tid." },
    { q: "Hvornår har man brug for mere?", a: "Når en medarbejder har fem eller flere stop om dagen, eller når størstedelen af omsætningen ligger i faste, tilbagevendende aftaler." },
    { q: "Kan man have begge dele i ét system?", a: "Ja. I Serviceydere er ordren, ruten, udførelsen og faktureringen den samme datastrøm." },
  ],
  sections: [
    { heading: "Kort svar", paragraphs: [
      "Klassisk ordrestyring holder styr på ordrer og fakturering, men lader planlægningen af dagen være op til en person med en kalender og et godt lokalkendskab. Serviceydere lægger planlægningen ind i systemet: kørselstid, rækkefølge, gentagelser og konflikter håndteres, mens du planlægger.",
    ]},
    { heading: "Det ordrestyring typisk ikke løser", list: [
      "Rækkefølgen på dagen, og hvad en ændring koster i kørsel.",
      "Faste aftaler der skal fremskrives måneder frem uden manuel oprettelse.",
      "Konflikter: dobbeltbooking, ferie, helligdage og for lidt tid mellem to adresser.",
      "Hvad der faktisk blev udført kontra hvad der var planlagt.",
    ]},
    { heading: "Hvad du får med Serviceydere", list: [
      <><a href="/software/ruteplanlaegger">Visuel ruteplanlægger</a> med drag & drop og beregnede ankomsttider.</>,
      <><a href="/software/medarbejder-app">Medarbejder-app</a> med tjek ind og ud, så planen bliver til dokumenterede fakta.</>,
      <><a href="/software/fakturering-og-regnskab">Fakturering</a> på grundlag af udført arbejde med bogføring i e-conomic eller Dinero.</>,
      "En markedsplads der giver nye opgaver oveni.",
    ]},
    { heading: "Læs også", list: [
      <a href="/blog/bedste-system-til-servicevirksomheder-2026">Oversigt: bedste system til servicevirksomheder i 2026</a>,
      <a href="/blog/serviceydere-vs-regneark">Serviceydere vs. regneark og kalender</a>,
      <a href="/software">Alt om Serviceydere-systemet</a>,
    ]},
  ],
});
export default Post;
