import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "afloeb-lugter-saadan-fjerner-du-lugten",
  keywords: "afløb lugter, afløb stinker, lugt fra håndvask, kloakgas køkken, natron eddike afløb, biofilm afløb, vandlås tør",
  faq: [
    { q: "Hvorfor lugter mit afløb pludselig?", a: "Tre årsager: tør vandlås (sjældent brugt afløb), biofilm i røret (sæberester + fedt) eller defekt rør med kloakgas. Tjek altid vandlåsen først." },
    { q: "Virker natron + eddike?", a: "Ja på biofilm — men kun midlertidigt. Den synlige bruse-effekt er imponerende, men kemisk er det en svag rens. Følg op med kogende vand."},
    { q: "Hvornår skal jeg ringe efter VVS?", a: "Hvis lugten fortsætter trods rens, hvis flere afløb lugter samtidigt, eller hvis du hører gurglen i toilettet — det kan være kloakgas." },
  ],
  sections: [
    { paragraphs: ["Lugten kommer næsten altid fra biofilm — bakteriebelægning på rørvæggen der dannes af sæberester, hudceller og fedt. Den slipper svovlforbindelser ud (rådne æg-lugt). I sjældnere tilfælde stiger kloakgas op gennem en tør vandlås."] },
    { heading: "Trin 1: Tjek vandlåsen", paragraphs: [
      "Hæld 2 liter vand i afløbet. Hvis lugten forsvinder, var vandlåsen tør (typisk i gæstebadeværelser eller kælderafløb). Skyl med 1 dl olie ovenpå vandet — så fordamper det ikke så hurtigt."  ,
    ] },
    { heading: "Trin 2: Mekanisk rens", ordered: [
      "Skru risten af.",
      "Træk synlig hår/snavs ud med pincet eller specielt hårtrækker.",
      "Skyl med kogende vand (1 liter).",
    ] },
    { heading: "Trin 3: Natron + eddike + kogende vand", ordered: [
      "Hæld 1 dl natron i afløbet.",
      "Hæld 2 dl varm eddike på — det bruser.",
      "Lad virke 15 minutter.",
      "Skyl med 2 liter kogende vand.",
    ] },
    { heading: "Trin 4: Hvis det stadig lugter", paragraphs: [
      "Brug enzymbaseret afløbsrens (fx Bio-Force). Enzymerne fordøjer biofilmen. Lad sidde over natten. Gentag månedligt forebyggende."  ,
    ] },
    { heading: "Forebyg ny biofilm", list: [
      "Hæld kogende vand i afløbet en gang om ugen",
      "Brug aldrig fedt direkte i afløbet — tør først af med papir",
      "Hårfilter på brusen og badekarret",
      "Enzymrens månedligt",
    ] },
    { heading: "Det skal du IKKE bruge", list: [
      "Klorbaseret afløbsrens + andre kemikalier samtidigt: giftige dampe",
      "Saltsyre: beskadiger ældre rør",
      "Wire-rensere uden træning: kan punktere PEX-rør",
    ] },
  ],
});