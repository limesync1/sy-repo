import { defineBlogPost } from "../defineBlogPost";
import { TrialNote } from "./_routeTrial";

export default defineBlogPost({
  slug: "ruteplanlaegning-rengoeringsfirma",
  keywords: "ruteplanlægning rengøring, system til rengøringsfirma, planlægning rengøringsfirma, rengøring faste kunder, hold rengøring",
  faq: [
    { q: "Skal kunden altid have den samme medarbejder?", a: "Det er en stor fordel for tryghed og kvalitet. Giv hver medarbejder faste områder, så sker det næsten af sig selv." },
    { q: "Hvordan håndterer jeg sygdom?", a: "Flyt den syge medarbejders aftaler til en kollega i samme område eller til en anden dag — et godt værktøj gør det for hele dagen på én gang." },
  ],
  sections: [
    { paragraphs: [
      "I rengøring er kunden ofte hjemme eller har givet dig en nøgle. Derfor betyder faste dage og faste ansigter lige så meget som kort køretid.",
    ] },
    { heading: "Planlæg efter interval og område", list: [
      "Ugentlige kunder først — de er rygraden i ugen.",
      "Kunder hver 14. dag parres, så to kunder deler samme plads på skift.",
      "Månedlige kunder fylder hullerne.",
    ] },
    { heading: "Faste hold", paragraphs: [
      "Giv hvert hold eller hver medarbejder et område. Det giver kortere kørsel, og kunden ved, hvem der kommer.",
    ] },
    { heading: "Tid og kvalitet", list: [
      "Registrér hvornår besøget starter og slutter.",
      "Brug tiden til at sætte den rigtige pris næste gang.",
      "Noter særlige ønsker på kunden, så alle kan se dem.",
    ] },
    { body: <TrialNote /> },
  ],
});
