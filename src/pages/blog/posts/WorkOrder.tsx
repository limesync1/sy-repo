import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "arbejdsseddel-digital",
  keywords: "arbejdsseddel, digital arbejdsseddel, arbejdsseddel app, arbejdsseddel skabelon, køreseddel",
  faq: [
    { q: "Hvad er en arbejdsseddel?", a: "En beskrivelse af en opgave: hvor, hvad, hvornår og hvem — og bagefter hvad der faktisk blev udført." },
    { q: "Kan jeg stadig printe?", a: "Ja. Køresedler kan printes eller gemmes som PDF, hvis nogen foretrækker papir." },
  ],
  sections: [
    { paragraphs: [
      "Arbejdssedlen fortæller medarbejderen, hvad der skal laves — og fortæller dig bagefter, hvad der blev lavet. På papir bliver den glemt, våd eller ulæselig. Digitalt følger den med i telefonen.",
    ] },
    { heading: "Det skal en arbejdsseddel indeholde", list: [
      "Kundens navn og adresse.",
      "Opgaven og eventuelle noter (nøgle, kode, særlige ønsker).",
      "Dato og ansvarlig medarbejder.",
      "Tidsforbrug.",
      "Markering af udført — og evt. bemærkning.",
    ] },
    { heading: "Fordele ved den digitale arbejdsseddel", list: [
      "Medarbejderen ser dagens stop i rækkefølge.",
      "Udført arbejde registreres med det samme.",
      "Kontoret ser status uden at ringe.",
      "Udførte opgaver kan faktureres direkte.",
    ] },
    { body: (
      <p>
        Se <a href="/software/medarbejder-app">medarbejder-appen</a> og <a href="/blog/timeregistrering-app-servicefirma">timeregistrering</a>.{" "}
        <a href="/blog/proev-ruteplanlaegger-gratis">Prøv gratis i 30 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
