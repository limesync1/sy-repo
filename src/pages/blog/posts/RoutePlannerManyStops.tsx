import { defineBlogPost } from "../defineBlogPost";
import { TrialNote } from "./_routeTrial";

export default defineBlogPost({
  slug: "ruteplanlaegger-med-flere-stop",
  keywords: "ruteplanlægger flere stop, ruteplanlægning flere stop, ruteplan mange stop, rute med flere adresser, google maps flere stop",
  faq: [
    { q: "Hvor mange stop kan Google Maps tage?", a: "Google Maps har en lav grænse for stop pr. rute og laver ikke selv den bedste rækkefølge. Til en hel arbejdsdag rækker det sjældent." },
    { q: "Hvad betyder optimering af stop?", a: "At værktøjet selv finder den rækkefølge, der giver kortest samlet køretid, i stedet for at du skal flytte stop rundt i hånden." },
    { q: "Kan medarbejderne se ruten på telefonen?", a: "Ja, i Serviceydere har hver medarbejder dagens stop i en app og kan starte navigation til næste adresse." },
  ],
  sections: [
    { paragraphs: [
      "Skal du forbi 15 adresser i dag, er det rækkefølgen, der afgør, om dagen tager seks eller otte timer. Det er her, en ruteplanlægger med flere stop gør forskellen.",
    ] },
    { heading: "Hvorfor almindelige kort ikke rækker", list: [
      "De har en lav grænse for antal stop.",
      "De laver ikke selv den bedste rækkefølge.",
      "De husker ikke kunder fra uge til uge.",
      "De ved ikke, hvor lang tid hvert besøg tager.",
    ] },
    { heading: "Sådan planlægger du mange stop", ordered: [
      "Saml dagens adresser ét sted — helst ud fra dine faste aftaler, så du ikke taster dem.",
      "Angiv start og slut (hjem, lager eller første kunde).",
      "Lad værktøjet foreslå rækkefølgen og se køretiden.",
      "Ret i hånden, hvor en kunde kun kan om formiddagen.",
      "Send ruten til medarbejderens telefon.",
    ] },
    { heading: "Det skal du kigge efter", list: [
      "Ubegrænset antal stop pr. dag.",
      "Optimering med ét tryk og visning af køretid og afstand.",
      "Besøgstid pr. kunde, så du kan se, om dagen kan nås.",
      "En app til medarbejderne, hvor de markerer udført.",
      "Automatisk næste besøg ud fra kundens interval.",
    ] },
    { body: <TrialNote /> },
  ],
});
