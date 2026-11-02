import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "billeddokumentation-foer-efter",
  keywords: "før efter billeder, billeddokumentation, dokumentation af udført arbejde",
  faq: [
    { q: "Skal der altid tages billeder?", a: "Nej. Det er frivilligt og bruges, hvor det giver værdi." },
    { q: "Hvor kan jeg se billederne?", a: "I Serviceydere ligger de på aftalen i virksomhedspanelet, grupperet pr. besøg." },
  ],
  sections: [
    { paragraphs: [
      "Når en kunde spørger, om I nu også var der, er et tidsstemplet billede det bedste svar. Det tager få sekunder og fjerner tvivlen.",
    ] },
    { heading: "Hvornår giver billeder mest mening?", list: [
      "Ved nye kunder og første besøg.",
      "Når noget var beskadiget eller blokeret i forvejen.",
      "Ved erhvervskunder, der skal dokumentere leverancen videre.",
      "Ved klager — så kan I se præcis, hvad der blev lavet.",
    ] },
    { heading: "Gode vaner for medarbejderne", list: [
      "Tag før-billedet, inden udstyret stilles frem.",
      "Samme vinkel før og efter.",
      "Et par billeder er nok — det skal være frivilligt og hurtigt.",
      "Billeder gemmes privat og vises kun for virksomheden.",
    ] },
    { body: (
      <p>
        Læs også <a href="/blog/ruteplanlaegning-for-servicevirksomheder">ruteplanlægning for servicevirksomheder</a> og <a href="/blog/samlefaktura-faste-kunder">samlefaktura til faste kunder</a>.{" "}
        <a href="/blog/proev-ruteplanlaegger-gratis">Prøv Serviceydere gratis i 14 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
