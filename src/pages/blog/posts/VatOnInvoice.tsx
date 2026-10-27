import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "moms-paa-faktura",
  keywords: "moms på faktura, pris uden moms, pris med moms, moms 25 procent, momsbeløb faktura",
  faq: [
    { q: "Hvor meget er momsen i Danmark?", a: "Den almindelige momssats er 25 %. En pris uden moms ganges med 1,25 for at få prisen med moms." },
    { q: "Skal private kunder se pris med moms?", a: "Ja. Over for private skal prisen oplyses med moms." },
  ],
  sections: [
    { paragraphs: [
      "Mange servicefirmaer regner i priser uden moms, mens private kunder tænker i priser med moms. Det giver misforståelser, hvis fakturaen ikke er tydelig.",
    ] },
    { heading: "Sådan regner du", list: [
      "Pris uden moms × 1,25 = pris med moms.",
      "Pris med moms × 0,8 = pris uden moms.",
      "Momsbeløbet = pris med moms × 0,2.",
    ] },
    { heading: "Sådan bør fakturaen vise det", ordered: [
      "Hver linje uden moms.",
      "Subtotal uden moms.",
      "Moms 25 % som eget beløb.",
      "Total med moms.",
    ] },
    { heading: "Tip", list: [
      "Angiv altid tydeligt, om en pris er uden eller med moms — både i tilbud, booking og på faktura.",
    ] },
    { body: (
      <p>
        <a href="/blog/faktura-skabelon-servicefirma">Faktura skabelon</a> <a href="/blog/tilbud-skabelon-servicefirma">tilbud skabelon</a>. <a href="/blog/proev-ruteplanlaegger-gratis">Prøv Serviceydere gratis i 14 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
