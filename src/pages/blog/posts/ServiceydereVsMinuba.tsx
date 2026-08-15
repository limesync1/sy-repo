import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "serviceydere-vs-minuba",
  keywords: "serviceydere vs minuba, minuba alternativ, ordrestyring håndværker, sagsstyring system",
  faq: [
    { q: "Hvad er Minuba?", a: "Minuba er et dansk sags- og ordrestyringssystem, der især bruges af håndværksvirksomheder til sager, timer, materialer og fakturagrundlag." },
    { q: "Hvad er den største forskel?", a: "Minuba er bygget om sagen — et projekt med timer og materialer. Serviceydere er bygget om ruten og den tilbagevendende aftale, og har desuden en markedsplads med nye opgaver." },
    { q: "Hvem passer Minuba bedst til?", a: "Håndværksvirksomheder med længerevarende sager, hvor materialeforbrug og sagsøkonomi er det centrale." },
    { q: "Hvem passer Serviceydere bedst til?", a: "Virksomheder med mange stop pr. dag og faste aftaler, hvor planlægning af kørsel og gentagelser er det, der afgør indtjeningen." },
    { q: "Kan Serviceydere håndtere projektopgaver?", a: "Ja. Engangsopgaver og længere opgaver ligger i samme kalender som de faste aftaler, men systemets styrke er planlægning af mange besøg." },
  ],
  sections: [
    { heading: "Kort svar", paragraphs: [
      "Minuba er sagsstyring til håndværk. Serviceydere er ruteplanlægning og drift til servicevirksomheder — plus en markedsplads. Valget afhænger af, om jeres hverdag mest består af få store sager eller mange gentagne besøg.",
    ]},
    { heading: "To forskellige udgangspunkter", list: [
      "Sagsstyring tager udgangspunkt i projektet: hvad blev der brugt af timer og materialer, og hænger sagen sammen økonomisk?",
      "Ruteplanlægning tager udgangspunkt i dagen: hvem kører hvorhen, i hvilken rækkefølge, og kan det nås?",
      "Har I begge dele, er spørgsmålet hvilken af dem der koster jer mest tid i dag.",
    ]},
    { heading: "Hvor Serviceydere adskiller sig", list: [
      <>Faste aftaler med intervaller og automatisk fremskrivning — se <a href="/software/ruteplanlaegger">ruteplanlæggeren</a>.</>,
      "Kørselstid og ankomsttider beregnes, mens du planlægger.",
      "Markedsplads med forespørgsler fra kunder i jeres område.",
      <>Profilside med online booking — se <a href="/software/booking-og-tilbud">booking og tilbud</a>.</>,
      "Brancheuafhængigt, så en virksomhed kan dække både håndværk og service.",
    ]},
    { heading: "Læs også", list: [
      <a href="/blog/bedste-system-til-servicevirksomheder-2026">Oversigt: bedste system til servicevirksomheder i 2026</a>,
      <a href="/blog/serviceydere-vs-ordrestyring">Serviceydere vs. klassisk ordrestyring</a>,
      <a href="/software/brancher">Hvilke brancher systemet dækker</a>,
    ]},
  ],
});
export default Post;
