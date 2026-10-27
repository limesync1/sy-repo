import { defineBlogPost } from "../defineBlogPost";
import { TrialNote } from "./_routeTrial";

export default defineBlogPost({
  slug: "timeregistrering-app-servicefirma",
  keywords: "timeregistrering app, timeregistrering servicefirma, medarbejder app, registrering af arbejdstid, tidsforbrug pr kunde",
  faq: [
    { q: "Skal medarbejderne taste timer?", a: "Nej, ikke i Serviceydere. De starter dagen og markerer hvert besøg som udført — så registreres tiden af sig selv." },
    { q: "Hvad bruger jeg tiderne til?", a: "Til at se om priserne passer, planlægge realistiske dage og dokumentere arbejdet over for kunden." },
  ],
  sections: [
    { paragraphs: [
      "Timeregistrering lyder kedeligt, men det er den hurtigste vej til bedre priser og ruter, der kan nås. Det skal bare være let for medarbejderen.",
    ] },
    { heading: "Det skal en god app kunne", list: [
      "Start og stop arbejdsdagen med ét tryk.",
      "Markér et besøg som udført direkte fra ruten.",
      "Vise tidsforbrug pr. kunde og pr. medarbejder.",
      "Lade dig rette en tid, hvis nogen glemte at trykke.",
    ] },
    { heading: "Brug tallene", list: [
      "Kunder der altid tager længere tid, skal have en ny pris.",
      "Dage der altid skrider, har for mange stop.",
      "Indlærte tider giver mere præcise ruter næste gang.",
    ] },
    { body: <TrialNote /> },
  ],
});
