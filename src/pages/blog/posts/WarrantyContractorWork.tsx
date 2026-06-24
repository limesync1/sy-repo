import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "garantitider-paa-haandvaerkerarbejde",
  keywords: "garanti håndværker, reklamationsfrist håndværker, AB-Forbruger 5 år, købeloven 2 år, garantitid badeværelse, 1 års gennemgang",
  faq: [
    { q: "Hvor lang er garantien på håndværkerarbejde?", a: "Købelovens reklamationsfrist er 2 år. Med AB-Forbruger (typisk på opgaver over 30.000 kr.) får du 5 års reklamationsret OG ret til 1- og 5-års gennemgang." },
    { q: "Hvad er forskellen på garanti og reklamationsret?", a: "Reklamationsret er lovgivet (2 år eller 5 år med AB-Forbruger). Garanti er en frivillig ekstra-tilsagn fra håndværkeren — fx 10 års garanti på tagsten. Begge kan eksistere samtidigt." },
    { q: "Hvad sker der ved 1- og 5-års gennemgang?", a: "Håndværkeren har pligt til at indkalde dig. I går arbejdet igennem og laver mangelliste. Mangler skal udbedres uden ekstra betaling. Møder de ikke op, har du stærk dokumentation for klage." },
  ],
  sections: [
    { paragraphs: ["De fleste boligejere tror at \"garantien udløb\" efter 2 år. Det er forkert ved opgaver med AB-Forbruger — du har 5 års reklamationsret OG to lovpligtige gennemgange. Her er hvad du har krav på."] },
    { heading: "Reklamationsfrister", list: [
      "Købeloven (uden AB-Forbruger): 2 år fra aflevering",
      "AB-Forbruger: 5 år fra aflevering",
      "Skjulte mangler: op til 10 år (kun ved grov uagtsomhed)",
      "Garanti (frivillig): efter aftale — typisk 5–25 år på materialer",
    ] },
    { heading: "Sådan reklamerer du rigtigt", ordered: [
      "Reklamér SKRIFTLIGT (mail eller anbefalet brev) så snart du opdager mangel.",
      "Beskriv manglen konkret + tag billeder med dato.",
      "Sæt rimelig frist for udbedring (typisk 14–30 dage).",
      "Bed om afhjælpning ELLER omlevering — du må ikke kræve penge tilbage som første skridt.",
      "Klag til Byggeriets Ankenævn (byggerietsankenaevn.dk) hvis håndværker ikke svarer.",
    ] },
    { heading: "1- og 5-års gennemgang — det skal du tjekke", list: [
      "Revner i fuger og overgange",
      "Misfarvning eller bobler i maling",
      "Skæve gulvbrædder eller knirken",
      "Utætheder ved vinduer, tag, vådrum",
      "Funktion af alle elinstallationer og VVS",
    ] },
    { heading: "Sådan styrker du din position", paragraphs: ["Gem ALT skriftligt: tilbud, fakturaer, mailkorrespondance, billeder før/under/efter. Få afleveringsforretning med underskrevet mangelliste. Det halverer ofte konflikten ved en senere reklamationssag."] },
  ],
});
