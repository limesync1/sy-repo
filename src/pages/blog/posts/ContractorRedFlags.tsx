import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "roede-flag-i-haandvaerkertilbud",
  keywords: "røde flag håndværkertilbud, sort arbejde, falsk håndværker, billigt håndværker tilbud, snyd håndværker, advarselstegn håndværker",
  faq: [
    { q: "Er det altid snyd hvis prisen er meget lav?", a: "Ikke nødvendigvis — nye firmaer, mindre opgaver i lavsæson og lokale enkeltmandsfirmaer kan reelt være billigere. Men hvis prisen er 30%+ under de andre tilbud, bør du spørge ind." },
    { q: "Må håndværkeren bede om kontant betaling?", a: "Beløb over 10.000 kr. inkl. moms SKAL betales digitalt — ellers risikerer du selv at hæfte for håndværkerens manglende skat. Det er også et krav for BoligJob-fradrag." },
    { q: "Hvad skal jeg gøre hvis jeg opdager røde flag?", a: "Gå videre. Det er bedre at bruge en uge mere på at finde det rette firma end at sidde med en halvfærdig opgave og et firma der er forsvundet." },
  ],
  sections: [
    { paragraphs: ["Når en opgave går galt, er der næsten altid advarselstegn allerede i tilbudsfasen. Lærer du at se dem, har du sparet dig selv for de værste håndværkerhistorier."] },
    { heading: "De 7 røde flag", ordered: [
      "Tilbuddet er 30%+ billigere end de andre — uden klar forklaring.",
      "Vagt opgavebeskrivelse: \"male stuen\" uden m², lag eller materialer.",
      "Krav om stor forudbetaling (mere end 25–30%).",
      "Vil kun have kontant betaling eller MobilePay til privat nummer.",
      "Ingen synlig adresse, hjemmeside eller historik på CVR.",
      "Presser dig til at skrive under \"i dag for at få prisen\".",
      "Vil ikke skrive AB-Forbruger på opgaver over 30.000 kr.",
    ] },
    { heading: "Sådan tjekker du på 2 minutter", list: [
      "Slå CVR op på cvr.dk — tjek selskabsform, status og stiftelsesdato.",
      "Google firmanavn + \"anmeldelse\" eller \"snyd\".",
      "Spørg efter 2 referencer og RING til dem.",
      "Tjek om firmaet har en hjemmeside med adresse og fastnet.",
    ] },
    { heading: "Det gælder også \"venner af venner\"", paragraphs: ["Mange snydehistorier starter med \"min nabo kender en der gør det billigt\". Bekendtskab er ingen erstatning for CVR, forsikring og skriftlig aftale. Du har INGEN reklamationsret hvis arbejdet er udført sort."] },
  ],
});