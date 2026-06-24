import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "forsikringsskade-anmeldelse-haandvaerker",
  keywords: "forsikringsskade håndværker, vandskade anmeldelse, taksator håndværker, husforsikring skade, indboforsikring vand, brandskade håndværker",
  faq: [
    { q: "Skal jeg vente på taksator før jeg bestiller håndværker?", a: "Ved store skader: ja, bestil kun akut-stop (lukke for vand, dække tag). Ved mindre skader: dokumentér med billeder + få håndværker til skadesopgørelse FØR udbedring." },
    { q: "Vælger jeg selv håndværker eller bruger forsikringens?", a: "Du har ret til selv at vælge håndværker — men forsikringen dækker kun til deres takst. Forsikringens egne firmaer er ofte billigere, men kan have ventetid og standardløsninger." },
    { q: "Hvad gør jeg hvis forsikringen ikke vil dække?", a: "Bed om skriftlig begrundelse. Klag til selskabet, derefter til Ankenævnet for Forsikring (ankeforsikring.dk) — gratis for forbrugere, bindende for selskabet under 250.000 kr." },
  ],
  sections: [
    { paragraphs: ["En vand-, brand- eller stormskade bliver hurtigt dyrere end nødvendigt hvis du ikke kender rækkefølgen. De første 24 timer afgør om forsikringen dækker fuldt — eller om du selv hænger på regningen."] },
    { heading: "Det skal du gøre i denne rækkefølge", ordered: [
      "STOP skaden: luk for vand, sluk strøm i berørt område, dæk tag.",
      "Tag billeder/video AF alt — før noget rengøres.",
      "Anmeld til forsikringen samme dag (telefon + e-mail).",
      "Få skadenummer skriftligt.",
      "Spørg om de sender taksator eller godkender udbedring efter regning.",
      "Indhent 2–3 tilbud på udbedring og send til forsikringen.",
      "Få skriftlig dækningstilsagn FØR håndværker starter.",
      "Gem alle kvitteringer, fakturaer og korrespondance.",
    ] },
    { heading: "Typiske faldgruber", list: [
      "Du rydder op for hurtigt — taksator kan ikke se omfanget.",
      "Håndværker starter uden dækningstilsagn — du hænger på regningen.",
      "Du underskriver \"transport i forsikring\" til håndværker uden at læse vilkår.",
      "Du glemmer at anmelde indenfor selskabets frist (typisk 7 dage).",
    ] },
    { heading: "Selvrisiko og afskrivning", paragraphs: ["Selvrisiko ligger typisk på 4.000–10.000 kr. Bemærk at forsikringen afskriver gamle materialer — et 25 år gammelt køkken erstattes ikke 1:1 til nyt. Spørg eksplicit: \"Er det nyværdi eller dagsværdi?\" inden du går med deres tilbud."] },
  ],
});
