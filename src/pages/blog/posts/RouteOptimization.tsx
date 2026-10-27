import { defineBlogPost } from "../defineBlogPost";
import { TrialNote } from "./_routeTrial";

export default defineBlogPost({
  slug: "ruteoptimering",
  keywords: "ruteoptimering, optimering af ruter, rute optimering, kortere ruter, mindre kørsel, ruteplanlægning",
  faq: [
    { q: "Hvad er ruteoptimering?", a: "At finde den rækkefølge af stop, der giver kortest køretid — ofte kombineret med at flytte kunder til dage, hvor de ligger tættere på andre." },
    { q: "Betaler ruteoptimering sig for et lille firma?", a: "Ja, hvis du kører mellem kunder hver dag. Selv få minutter sparet pr. stop bliver til timer om måneden." },
  ],
  sections: [
    { paragraphs: [
      "Ruteoptimering handler om to ting: hvilke kunder der hører sammen på samme dag, og hvilken rækkefølge de skal besøges i. Det første giver ofte den største gevinst.",
    ] },
    { heading: "De fem typiske fejl", ordered: [
      "Kunder lægges på den dag, de ringer — ikke den dag, du alligevel er i området.",
      "Rækkefølgen er den samme, som da kunden blev oprettet.",
      "Besøgstiden er gættet, så dagen altid skrider.",
      "To medarbejdere kører i samme område samme dag.",
      "Der er ingen luft til ekstraopgaver, så alt bliver skubbet.",
    ] },
    { heading: "Sådan optimerer du i praksis", list: [
      "Saml kunder i zoner og giv hver zone en fast dag.",
      "Optimer rækkefølgen pr. medarbejder, ikke for hele firmaet på én gang.",
      "Brug de faktiske tider fra sidste besøg i stedet for gæt.",
      "Se køretid og afstand før og efter — så ved du, hvad du har sparet.",
    ] },
    { heading: "Hvornår skal du ikke optimere?", paragraphs: [
      "Hvis en kunde kun kan bestemte tidspunkter, eller en medarbejder har nøglen, er det vigtigere end den korteste vej. Et godt værktøj lader dig låse de stop og optimere resten.",
    ] },
    { body: <TrialNote /> },
  ],
});
