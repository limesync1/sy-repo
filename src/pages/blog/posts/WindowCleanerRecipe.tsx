import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "lav-dit-eget-vinduespudsemiddel",
  keywords: "vinduespudsemiddel opskrift, hjemmelavet vinduesrens, eddike vinduer, sprit pudsemiddel, vinduesvask diy, miljøvenlig vinduesrens, billig vinduespudsning",
  faq: [
    { q: "Er hjemmelavet vinduesrens lige så godt som købt?", a: "Ja — købte midler indeholder typisk vand, sprit/ammoniak og lidt sæbe. Du kan lave samme ting til 1/10 af prisen." },
    { q: "Må jeg blande eddike og sæbe?", a: "Ja, hvis det er almindelig opvaskesæbe. Bland aldrig eddike med klor — det danner giftige dampe." },
    { q: "Skader eddike vinduerne?", a: "Nej, men det kan slide på trækarme over tid. Skyl karmen af bagefter eller brug citronsyre i stedet." },
  ],
  sections: [
    { paragraphs: ["Fire opskrifter du kan blande på 2 minutter. Hæld i en sprayflaske og du sparer 60–80 % i forhold til købte midler."] },
    { heading: "Opskrift 1: Klassisk eddike (mest brugte)", list: [
      "5 dl lunkent vand",
      "1 dl hvid eddike (32 %)",
      "1 dråbe opvaskemiddel",
      "Evt. 5 dråber æterisk olie (citron) mod lugten",
    ] },
    { heading: "Opskrift 2: Stribefri sprit-blanding (bedst på store ruder)", list: [
      "4 dl vand",
      "1 dl husholdningssprit (70 %)",
      "1 spsk hvid eddike",
      "1 dråbe opvaskemiddel",
    ] },
    { heading: "Opskrift 3: Citronsyre (vintervenlig, mod kalk)", list: [
      "5 dl varmt vand",
      "2 tsk citronsyre",
      "1 dråbe opvaskemiddel",
    ] },
    { heading: "Opskrift 4: Børnesikker (uden alkohol og eddike)", list: [
      "5 dl vand",
      "1 tsk natron",
      "½ tsk opvaskemiddel",
    ] },
    { heading: "Sådan bruger du dem", ordered: [
      "Ryst flasken let inden brug.",
      "Spray let — du skal kunne nå at tørre op inden det tørrer.",
      "Brug mikrofiberklud + tør avispapir.",
      "Pudse i overskyet vejr — solen tørrer for hurtigt.",
    ] },
    { heading: "Hold dig fra disse blandinger", list: [
      "Eddike + klor: danner kloramin (giftigt)",
      "Sprit + klor: danner chloroform",
      "Brintoverilte + eddike: danner pereddikesyre",
    ] },
  ],
});