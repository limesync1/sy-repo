import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "serviceydere-vs-regneark",
  keywords: "regneark planlægning, excel ruteplan, google kalender servicevirksomhed, hvornår skifte til system",
  faq: [
    { q: "Kan man planlægge ruter i et regneark?", a: "Ja, og mange gør det. Det holder, så længe antallet af faste kunder er lille og der kun er én eller to medarbejdere at fordele dem på." },
    { q: "Hvornår bliver regnearket dyrt?", a: "Typisk når der er flere medarbejdere, når kunder har forskellige intervaller, eller når nogen skal huske hvad der blev udført for at kunne fakturere korrekt." },
    { q: "Hvad er den største risiko?", a: "At viden kun findes i hovedet på én person. Ferie, sygdom eller en opsigelse gør planlægningen usikker fra den ene dag til den anden." },
    { q: "Er det svært at skifte?", a: "Kunder kan importeres fra regneark, så det meste af arbejdet er at beslutte, hvordan jeres services og intervaller skal se ud." },
    { q: "Skal alt skiftes på én gang?", a: "Nej. De fleste starter med at lægge de faste kunder ind og planlægge én uge, før resten flyttes over." },
  ],
  sections: [
    { heading: "Kort svar", paragraphs: [
      "Et regneark og en delt kalender kan bære en lille servicevirksomhed langt. Det knækker som regel tre steder: når gentagne aftaler skal fremskrives, når flere medarbejdere skal koordineres, og når faktureringen bygger på hukommelse frem for registrering.",
    ]},
    { heading: "De typiske tegn på at I er vokset fra det", list: [
      "Nogen bruger fast en aften om ugen på at lægge næste uges plan.",
      "Kunder ringer og spørger hvornår I kommer, fordi ingen kan se det i systemet.",
      "Der bliver glemt fakturering på opgaver, der reelt blev udført.",
      "En sygemelding betyder, at dagen skal planlægges forfra i hånden.",
      "I tør ikke tage flere faste kunder ind, fordi kalenderen ikke kan bære det.",
    ]},
    { heading: "Hvad et system gør anderledes", list: [
      <>Faste aftaler oprettes én gang og fremskrives automatisk — se <a href="/software/ruteplanlaegger">ruteplanlæggeren</a>.</>,
      "Kørselstiden mellem adresser er en del af planen, ikke et gæt.",
      <>Udført arbejde registreres på stedet i <a href="/software/medarbejder-app">medarbejder-appen</a>.</>,
      <><a href="/software/fakturering-og-regnskab">Faktureringen</a> bygger på det, der faktisk blev udført.</>,
    ]},
    { heading: "Læs også", list: [
      <a href="/blog/bedste-system-til-servicevirksomheder-2026">Oversigt: bedste system til servicevirksomheder i 2026</a>,
      <a href="/blog/serviceydere-vs-ordrestyring">Serviceydere vs. klassisk ordrestyring</a>,
      <a href="/software/brancher">Hvilke brancher systemet dækker</a>,
    ]},
  ],
});
export default Post;
