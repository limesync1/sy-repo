import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "koerselsgodtgoerelse-servicefirma",
  keywords: "kørselsgodtgørelse 2026, kørselsgodtgørelse servicefirma, skattefri kørselsgodtgørelse, kørebog krav, kørsel medarbejdere",
  faq: [
    { q: "Hvad er satsen for kørselsgodtgørelse i 2026?", a: "Skattestyrelsen fastsætter satserne hvert år, med en højere sats for de første 20.000 km og en lavere sats derefter. Se de aktuelle satser på skat.dk, før du udbetaler." },
    { q: "Kræver skattefri kørselsgodtgørelse en kørebog?", a: "Ja. Der skal kunne dokumenteres dato, formål, start- og slutadresse, antal km og den anvendte sats." },
    { q: "Gælder det kørsel mellem hjem og arbejde?", a: "Nej, almindelig kørsel mellem hjem og fast arbejdssted er ikke erhvervsmæssig kørsel. Kørsel mellem kunder i løbet af dagen er typisk erhvervsmæssig." },
  ],
  sections: [
    { paragraphs: [
      "Kører dine medarbejdere i egen bil mellem kunderne, kan du udbetale skattefri kørselsgodtgørelse. Det er enkelt — så længe dokumentationen er i orden. Og det er netop dokumentationen, mange servicefirmaer kommer til at mangle.",
    ] },
    { heading: "Hvornår kan der udbetales skattefrit?", list: [
      "Kørslen er erhvervsmæssig — fx mellem kunder på en rute.",
      "Medarbejderen kører i egen bil, ikke firmaets.",
      "Godtgørelsen følger Skattestyrelsens satser for året.",
      "Der føres kontrol: en kørebog for hver tur.",
    ] },
    { heading: "Hvad kørebogen skal vise", list: [
      "Dato for kørslen.",
      "Formål — fx kundebesøg.",
      "Start- og slutadresse, også mellemliggende stop.",
      "Antal kørte kilometer.",
      "Den anvendte sats og det beregnede beløb.",
    ] },
    { heading: "Ruten er allerede din kørebog", paragraphs: [
      "Når dagens stop ligger i en ruteplanlægger, kender du allerede datoen, adresserne og rækkefølgen. Det er præcis de oplysninger, kørebogen kræver. Så i stedet for at medarbejderen skriver kilometer ned bagefter, kan ruten bruges som grundlag.",
    ] },
    { heading: "Typiske fejl", list: [
      "Runde tal som \"ca. 50 km\" uden adresser.",
      "Kørebog skrevet i én omgang ved månedens udgang.",
      "Kørsel hjem–arbejde talt med.",
      "Gamle satser fra sidste år.",
    ] },
    { body: (
      <p>
        Læs også <a href="/blog/koerebog-og-koerselsregnskab">kørebog og kørselsregnskab</a> og{" "}
        <a href="/blog/ruteoptimering">ruteoptimering</a>. <a href="/blog/proev-ruteplanlaegger-gratis">Prøv ruteplanlæggeren gratis i 30 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
