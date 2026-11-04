import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "koersel-app-servicefirma",
  keywords: "kørsel app, kørselsapp, app til kørsel firma, ruteapp, navigation flere stop",
  faq: [
    { q: "Kan medarbejderen navigere fra appen?", a: "Ja. Hvert stop kan åbnes i navigation, og ruten vises i rækkefølge." },
  ],
  sections: [
    { paragraphs: [
      "En almindelig navigationsapp kan føre dig fra A til B. En kørsel-app til servicefirmaer ved også, hvilke kunder der er på dagens rute, i hvilken rækkefølge, og hvad der er udført.",
    ] },
    { heading: "Det skal en kørsel-app kunne", list: [
      "Vise dagens stop i rækkefølge på kort.",
      "Navigere til næste stop med ét tryk.",
      "Markere ankomst og udført.",
      "Vise kundens noter, fx nøgle og kode.",
      "Give grundlag for kørebog og tidsforbrug.",
    ] },
    { heading: "Kørsel-app vs. ruteplanlægger", list: [
      "Ruteplanlæggeren bruges på kontoret til at fordele opgaver.",
      "Kørsel-appen bruges af medarbejderen i bilen.",
      "Det bedste er, når de to hænger sammen.",
    ] },
    { body: (
      <p>
        <a href="/software/medarbejder-app">Medarbejder-appen</a> <a href="/blog/ruteplanlaegger-med-flere-stop">ruteplanlægger med flere stop</a> <a href="/blog/koerselsgodtgoerelse-servicefirma">kørselsgodtgørelse</a>. <a href="/blog/proev-ruteplanlaegger-gratis">Prøv Serviceydere gratis i 30 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
