import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "7-spoergsmaal-foer-du-booker-haandvaerker",
  keywords: "spørgsmål håndværker, tjekliste håndværker, vælg håndværker, AB-Forbruger, forsikring håndværker, garanti håndværker, ekstraregning håndværker",
  faq: [
    { q: "Hvad er det vigtigste spørgsmål?", a: "\"Er prisen fast eller en overslagspris?\" — det afgør hele økonomien. Overslagspris må overskrides med op til 15%; derover skal du varsles skriftligt." },
    { q: "Skal jeg altid have AB-Forbruger?", a: "Ja, ved opgaver over 30.000 kr. inkl. moms. Den giver dig automatisk 1- og 5-års gennemgang og klare regler for ændringer." },
    { q: "Hvor finder jeg håndværkerens CVR?", a: "På cvr.dk — gratis. Tjek selskabsform, status (aktivt/ophørt), branchekode og adresse. Pas på enkeltmandsfirmaer uden historik på opgaver over 50.000 kr." },
  ],
  sections: [
    { paragraphs: ["De fleste håndværker-konflikter starter med ting der ikke blev afklaret før aftalen blev indgået. Stil de 7 spørgsmål nedenfor — det tager 10 minutter og kan spare dig titusinder."] },
    { heading: "De 7 spørgsmål", ordered: [
      "Er prisen fast eller overslag — og hvad er prisen pr. time hvis I går over?",
      "Hvad er jeres CVR-nummer, og hvor mange års erfaring har firmaet?",
      "Hvilken erhvervsansvarsforsikring har I — og hvad er summen?",
      "Bruger I underleverandører, og hvilke garantier giver de?",
      "Hvor stor er forudbetalingen, og hvilke milepæle udløser betalinger?",
      "Holder I afleveringsforretning med skriftlig mangelliste?",
      "Hvad sker der hvis tidsplanen skrider — er der dagbod?",
    ] },
    { heading: "Det fjerde spørgsmål er ofte det glemte", paragraphs: ["Underleverandører er almindelige (elektriker bestiller VVS, tømrer bestiller maler) — det er ikke et problem. Det bliver et problem hvis hovedentreprenøren ikke står for hele garantien. Sørg for at fakturaen kommer fra ÉT firma der står for hele opgaven."] },
    { heading: "Bonus: kræv det skriftligt", list: [
      "Opgavebeskrivelse med materialevalg",
      "Pris (fast eller overslag) med slutdato",
      "Betalingsplan + forudbetalingsgrænse (max 25–30%)",
      "Forsikring, garanti og reklamationsfrister",
      "AB-Forbruger ved opgaver over 30.000 kr.",
    ] },
  ],
});