import { defineBlogPost } from "../defineBlogPost";
import { TrialNote } from "./_routeTrial";

export default defineBlogPost({
  slug: "koerebog-og-koerselsregnskab",
  keywords: "kørebog, kørselsregnskab, kørselsregnskab app, kørebog firma, kørsel servicefirma",
  faq: [
    { q: "Hvad skal en kørebog indeholde?", a: "Typisk dato, start og slut, formål, de besøgte adresser og antal kilometer. Tjek altid de gældende krav og satser hos Skattestyrelsen." },
    { q: "Kan min rute bruges som kørebog?", a: "Ruten viser hvilke kunder der er besøgt og hvornår. Det er et godt grundlag, men kilometer og formål skal stadig stemme med Skattestyrelsens krav." },
  ],
  sections: [
    { paragraphs: [
      "Kører du mellem kunder hver dag, skal kørslen kunne dokumenteres. Den gode nyhed: har du styr på dine ruter, har du allerede det meste.",
    ] },
    { heading: "Det typiske indhold", list: [
      "Dato og formål med turen.",
      "Hvorfra og hvortil — eller listen af kunder på dagens rute.",
      "Antal kørte kilometer.",
    ] },
    { heading: "Undgå dobbeltarbejde", paragraphs: [
      "Mange taster kunderne både i kalenderen og i kørebogen. Bruger du en ruteplanlægger, ligger dagens adresser og rækkefølge der allerede — og afstanden for ruten kan ses.",
    ] },
    { heading: "Satser og regler", paragraphs: [
      "Satser for kørselsgodtgørelse og krav til dokumentation ændrer sig. Slå altid de aktuelle regler op hos Skattestyrelsen eller spørg din revisor.",
    ] },
    { body: <TrialNote /> },
  ],
});
