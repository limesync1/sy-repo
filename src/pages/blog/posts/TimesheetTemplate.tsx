import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "timeseddel-skabelon",
  keywords: "timeseddel skabelon, timeseddel, timeregistrering skabelon, timesedler medarbejdere",
  faq: [
    { q: "Hvad skal en timeseddel indeholde?", a: "Medarbejder, dato, start- og sluttid, pauser, opgave eller kunde og samlet tid." },
  ],
  sections: [
    { paragraphs: [
      "Timesedler på papir eller i regneark bliver ofte udfyldt bagefter — og så passer de sjældent. Her er en enkel skabelon, og et bud på hvordan det kan gøres nemmere.",
    ] },
    { heading: "Skabelon", ordered: [
      "Medarbejderens navn.",
      "Dato.",
      "Start og slut på dagen.",
      "Pauser.",
      "Kunde eller opgave pr. tidsrum.",
      "Samlet tid og evt. kørsel.",
    ] },
    { heading: "Hvorfor en app er nemmere", list: [
      "Medarbejderen trykker start dag og udført ved hvert stop.",
      "Tiden registreres, mens arbejdet sker.",
      "Du ser tidsforbrug pr. kunde og kan prissætte bedre.",
    ] },
    { body: (
      <p>
        <a href="/blog/timeregistrering-app-servicefirma">Timeregistrering-app</a> <a href="/blog/arbejdsseddel-digital">digital arbejdsseddel</a>. <a href="/blog/proev-ruteplanlaegger-gratis">Prøv Serviceydere gratis i 30 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
