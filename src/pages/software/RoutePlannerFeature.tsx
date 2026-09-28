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
    "Træk aftaler ind på den rigtige dag og medarbejder. Systemet hjælper med rækkefølge, afstand, kapacitet og konflikter.",
  breadcrumbLabel: "Ruteplanlægger",
  answer:
    "Ruteplanlæggeren i Serviceydere er et visuelt planlægningsværktøj, hvor du fordeler aftaler på medarbejdere og dage ved at trække dem på plads. Den håndterer både enkeltstående og gentagne aftaler, optimerer rækkefølgen mellem stop og advarer ved fravær og andre konflikter.",
  facts: [
    "Drag & drop mellem medarbejdere, dage og rækkefølge.",
    "Gentagne aftaler: ugentlig, hver 14. dag, månedlig eller eget interval.",
    "Afstand og stoprækkefølge beregnes løbende.",
    "Konfliktadvarsler ved overlap, ferie, helligdage og lukkedage.",
    "Ruteoptimering foreslår en kortere rækkefølge på dagen.",
    "Ændringer kan gælde ét stop eller hele serien.",
    "Sygemelding i tre trin med forslag til afløser.",
    "Print af køresedler og udsendelse til medarbejder-appen.",
  ],
  sections: [
    {
      heading: "Alle funktioner i ruteplanlæggeren",
      paragraphs: [
        <>Herunder står hvad planlæggeren faktisk indeholder. Hver funktion er beskrevet med et eksempel og korte trin i den <Link to="/software/funktioner">søgbare funktionsguide</Link>, som også kan hentes som PDF.</>,
      ],
      list: [
        "Planlægning: træk aftaler ind på ruter, panel med aftaler uden rute (søgning og filtre), auto-fordeling med forhåndsvisning, masse-handlinger på flere aftaler, opret bestilling direkte i planlæggeren, opret og redigér ruter.",
        "Kalender: uge-, måneds- og agendavisning, dagsoversigt, valgfri tæthed og mørk tilstand.",
        "Kort og kørsel: ruter tegnet med nummererede stop, afstande, ruteoptimering og forslag til næste ledige dag.",
        "Faste aftaler: intervaller fra ugentlig til frit valgt, valg mellem ét besøg og hele serien, pauser i en periode uden at slette serien.",
        "Medarbejdere og fravær: sygemelding i tre trin med forslag til afløser, ferie, fridage og danske helligdage, dagsvisning med en kolonne pr. medarbejder.",
        "Kvalitet og kontrol: konfliktadvarsler, forhåndsvisning før større ændringer gemmes, fortryd og gentag, historik på hver rute og diagnostik af skæve data.",
        "Print, eksport og deling: køresedler til print eller PDF, udsendelse til medarbejder-appen, vejrudsigt på dagen og tastaturgenveje til hele flowet.",
      ],
    },
    {
      heading: "Sådan fungerer planlægningen",
      list: [
        "Aftaler uden rute ligger i en liste ved siden af kalenderen. Du trækker dem ind på den dag og den medarbejder, de skal udføres af.",
        "Når et stop flyttes, opdateres rækkefølge, afstand og dagens stopkapacitet med det samme.",
        "Flytter du et stop i en fast aftale, bliver du spurgt om det gælder denne gang eller hele serien.",
        "Konflikter vises direkte i kalenderen — dobbeltbooking, for lidt tid mellem to adresser, fravær eller helligdag.",
        "Fortryd-funktion på handlinger, så en fejltrækning ikke bliver dyr.",
      ],
    },
    {
      heading: "Faste aftaler og gentagelser",
      paragraphs: [
        "Størstedelen af arbejdet i en servicevirksomhed er tilbagevendende. Derfor er gentagne aftaler ikke en tilføjelse, men fundamentet: du opretter aftalen én gang med et interval, og systemet fremskriver kommende besøg automatisk.",
      ],
      list: [
        "Standardintervaller (uge, 14. dag, måned, kvartal) og frit definerede intervaller.",
        "Pauser i aftalen — fx kunder der holder sommerferie — uden at slette serien.",
        "Automatisk oprettelse af næste forekomst, så kalenderen aldrig løber tør.",
        "Historik på hvad der faktisk blev udført, ikke kun hvad der var planlagt.",
      ],
    },
    {
      heading: "Afstand, rækkefølge og optimering",
      paragraphs: [
        "Adresser placeres på kortet, så stoppene kan sættes i en logisk rækkefølge med kortere samlet kørsel.",
        "Ruteoptimering foreslår en rækkefølge med mindre kørsel på dagen. Forslaget vises, før det anvendes — du beslutter selv.",
      ],
    },
    {
      heading: "Fra rute til udført arbejde",
      paragraphs: [
        <>Ruten sendes videre til <Link to="/software/medarbejder-app">medarbejder-appen</Link>, hvor stoppene tjekkes af undervejs. Udført arbejde kan derefter faktureres og <Link to="/software/fakturering-og-regnskab">bogføres automatisk</Link>, uden at nogen skal taste dagen ind igen.</>,
      ],
    },
    {
      heading: "Guide og hjælp",
      paragraphs: [
        <>Alle funktioner er samlet i en <Link to="/software/funktioner">søgbar funktionsguide</Link> med eksempler og trin, og kan hentes som PDF-brugerguide. Inde i planlæggeren forklares de samme funktioner direkte i skærmbilledet.</>,
      ],
    },
  ],
  faq: [
    {
      q: "Hvad er en ruteplanlægger?",
      a: "En ruteplanlægger er et værktøj, der fordeler aftaler på medarbejdere og dage og tager højde for kørsel mellem adresserne. I Serviceydere gøres det visuelt med drag & drop, stopbaseret kapacitet og konfliktadvarsler.",
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
      a: "Der er en guide i tre trin: du vælger medarbejder og periode, vælger handling pr. berørt rute (erstat med kollega, fordel på flere, flyt dato eller fjern tildeling) og bekræfter. Systemet foreslår afløsere og viser konflikter, inden ændringen gemmes.",
    },
    {
      q: "Findes der en brugerguide til ruteplanlæggeren?",
      a: "Ja. Alle funktioner er beskrevet med eksempler og trin i den søgbare funktionsguide på serviceydere.dk/software/funktioner, som også kan hentes som PDF. De samme forklaringer vises direkte i planlæggeren.",
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
    body: "Læg dine faste kunder ind og se hele ugen fordelt på medarbejdere i en overskuelig rækkefølge.",
  },
});
export default Page;
