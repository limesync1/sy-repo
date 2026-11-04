import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "samlefaktura-faste-kunder",
  keywords: "samlefaktura, samlet faktura, månedlig faktura, faktureringsinterval, fakturering faste kunder",
  faq: [
    { q: "Hvilke intervaller kan jeg vælge?", a: "Efter hvert besøg, hver 14. dag, månedligt eller kvartalsvis — som standard for firmaet, pr. kunde eller pr. aftale." },
  ],
  sections: [
    { paragraphs: [
      "Kommer du hos en kunde hver uge, er det mange fakturaer. En samlefaktura samler besøgene i en periode på én faktura, med en linje og dato pr. besøg.",
    ] },
    { heading: "Fordele", list: [
      "Færre fakturaer og mindre administration.",
      "Kunden får ét overblik.",
      "Færre betalinger at afstemme.",
    ] },
    { heading: "Sådan sætter du det op", ordered: [
      "Vælg standardinterval under Regnskab.",
      "Giv særlige kunder deres eget interval.",
      "Udførte besøg samles og faktureres ved periodens slut.",
    ] },
    { body: (
      <p>
        Læs om <a href="/blog/aflyste-besoeg-fakturering-faste-kunder">aflyste besøg og kontrol af samlefakturaer</a>, <a href="/blog/faktura-skabelon-servicefirma">fakturaskabelon</a>, <a href="/blog/economic-integration-servicefirma">e-conomic integration</a> og <a href="/software/fakturering-og-regnskab">fakturering og regnskab</a>. <a href="/blog/proev-ruteplanlaegger-gratis">Prøv Serviceydere gratis i 30 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
