import { Link } from "react-router-dom";
import { defineSoftwarePage } from "./defineSoftwarePage";

const Page = defineSoftwarePage({
  canonicalPath: "/software/ruteplanlaegger",
  metaTitle: "Ruteplanlægger til servicevirksomheder | Serviceydere",
  metaDescription:
    "Planlæg dagens og ugens ruter med drag & drop, faste aftaler, kørselstid, ETA og konfliktadvarsler. Ruteplanlægning til rengøring, have, håndværk og service.",
  keywords:
    "ruteplanlægger, ruteplanlægning, planlægning af serviceruter, kørselsplanlægning, faste aftaler, rengøringsruter, serviceruter software",
  heroEyebrow: "Ruteplanlægger",
  heroTitle: "Planlæg ugen på skærmen — ikke i hovedet",
  heroSubtitle:
    "Træk opgaver ind på den rigtige medarbejder og det rigtige tidspunkt. Systemet regner kørselstid, ankomsttider og konflikter ud, mens du planlægger.",
  breadcrumbLabel: "Ruteplanlægger",
  answer:
    "Ruteplanlæggeren i Serviceydere er et visuelt planlægningsværktøj, hvor du fordeler opgaver på medarbejdere og dage ved at trække dem på plads. Den håndterer både engangsopgaver og gentagne aftaler, beregner kørselstid og forventede ankomsttider mellem stop, og advarer med det samme hvis to opgaver overlapper, en medarbejder er optaget, eller dagen ikke kan nås.",
  facts: [
    "Drag & drop mellem medarbejdere, dage og rækkefølge.",
    "Gentagne aftaler: ugentlig, hver 14. dag, månedlig eller eget interval.",
    "Kørselstid og ETA mellem stop beregnes løbende.",
    "Konfliktadvarsler ved overlap, ferie, helligdage og lukkedage.",
    "Ruteoptimering foreslår en kortere rækkefølge på dagen.",
    "Ændringer kan gælde ét stop eller hele serien.",
  ],
  sections: [
    {
      heading: "Sådan fungerer planlægningen",
      list: [
        "Uoverførte opgaver ligger i en liste ved siden af kalenderen. Du trækker dem ind på den dag og den medarbejder, de skal udføres af.",
        "Når et stop lander, opdateres ankomsttiderne for resten af dagen automatisk, så du kan se hvad ændringen koster.",
        "Flytter du et stop i en fast aftale, bliver du spurgt om det gælder denne gang eller hele serien.",
        "Konflikter vises direkte i kalenderen — dobbeltbooking, for lidt tid mellem to adresser, fravær eller helligdag.",
        "Fortryd-funktion på handlinger, så en fejltrækning ikke bliver dyr.",
      ],
    },
    {
      heading: "Faste aftaler og gentagelser",
      paragraphs: [
        "Størstedelen af arbejdet i en servicevirksomhed er tilbagevendende. Derfor er gentagne aftaler ikke en tilføjelse, men fundamentet: du opretter aftalen én gang med interval og varighed, og systemet fremskriver kommende besøg automatisk.",
      ],
      list: [
        "Standardintervaller (uge, 14. dag, måned, kvartal) og frit definerede intervaller.",
        "Pauser i aftalen — fx kunder der holder sommerferie — uden at slette serien.",
        "Automatisk oprettelse af næste forekomst, så kalenderen aldrig løber tør.",
        "Historik på hvad der faktisk blev udført, ikke kun hvad der var planlagt.",
      ],
    },
    {
      heading: "Kørselstid, ETA og optimering",
      paragraphs: [
        "Adresser geokodes, og kørselstiden mellem stop bruges til at beregne, hvornår medarbejderen realistisk er fremme. Du kan justere med egne køretidsregler, hvis systemets estimat ikke passer til jeres område eller køretøj.",
        "Ruteoptimering foreslår en rækkefølge med mindre kørsel på dagen. Forslaget vises, før det anvendes — du beslutter selv.",
      ],
    },
    {
      heading: "Fra rute til udført arbejde",
      paragraphs: [
        <>Ruten sendes videre til <Link to="/software/medarbejder-app">medarbejder-appen</Link>, hvor stoppene tjekkes af undervejs. Udført arbejde kan derefter faktureres og <Link to="/software/fakturering-og-regnskab">bogføres automatisk</Link>, uden at nogen skal taste dagen ind igen.</>,
      ],
    },
  ],
  faq: [
    {
      q: "Hvad er en ruteplanlægger?",
      a: "En ruteplanlægger er et værktøj, der fordeler opgaver på medarbejdere og tidspunkter og tager højde for kørsel mellem adresserne. I Serviceydere gøres det visuelt med drag & drop, og systemet beregner kørselstid, ankomsttider og konflikter, mens du planlægger.",
    },
    {
      q: "Kan den håndtere faste, gentagne kunder?",
      a: "Ja. Aftaler kan sættes til ugentlig, hver 14. dag, månedlig eller et selvvalgt interval, og kommende besøg oprettes automatisk. Du kan sætte en aftale på pause og ændre enten et enkelt besøg eller hele serien.",
    },
    {
      q: "Optimerer den rækkefølgen på dagen?",
      a: "Ja. Ruteoptimering foreslår en rækkefølge med kortere samlet kørsel. Forslaget vises først, så planlæggeren kan godkende eller afvise det.",
    },
    {
      q: "Hvad sker der, hvis en medarbejder melder sig syg?",
      a: "Dagens stop kan flyttes samlet til en anden medarbejder eller en anden dag, og systemet viser med det samme hvilke konflikter det giver på den nye plan.",
    },
    {
      q: "Skal jeg installere noget?",
      a: "Nej. Ruteplanlæggeren kører i browseren og kræver ingen installation. Medarbejderne bruger den mobile visning på deres egen telefon.",
    },
    {
      q: "Hvilke brancher kan bruge ruteplanlæggeren?",
      a: "Alle servicebrancher hvor medarbejdere kører ud til kunder — rengøring, vinduespudsning, haveservice, håndværk, flytning, skadedyrsbekæmpelse, autoservice og flere.",
    },
  ],
  cta: {
    heading: "Prøv planlægningen med din egen uge",
    body: "Læg dine faste kunder ind og se hele ugen fordelt på medarbejdere med realistiske ankomsttider.",
  },
});
export default Page;
