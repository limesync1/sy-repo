import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "kundeportal-servicefirma",
  keywords: "kundeportal, kundelogin servicefirma, selvbetjening kunder",
  faq: [
    { q: "Skal kunden oprette sig?", a: "Kunden får adgang via sin e-mail." },
    { q: "Kan kunden se priser?", a: "Kunden ser sine aftaler og fakturaer." },
  ],
  sections: [
    { paragraphs: [
      "De fleste opkald til et servicefirma handler om tre ting: hvornår kommer I, hvad koster det, og har I fået min betaling. En kundeportal svarer på alle tre.",
    ] },
    { heading: "Det ser kunden i portalen", list: [
      "Kommende aftaler og datoer.",
      "Fakturaer — også samlefakturaer med flere besøg.",
      "Hvilke besøg en faktura dækker.",
      "Mulighed for at skrive til firmaet.",
    ] },
    { heading: "Det får firmaet", list: [
      "Færre opkald om datoer.",
      "Færre spørgsmål om fakturaer.",
      "Mere professionelt indtryk.",
    ] },
    { body: (
      <p>
        Læs også <a href="/blog/ruteplanlaegning-for-servicevirksomheder">ruteplanlægning for servicevirksomheder</a> og <a href="/blog/samlefaktura-faste-kunder">samlefaktura til faste kunder</a>.{" "}
        <a href="/blog/proev-ruteplanlaegger-gratis">Prøv Serviceydere gratis i 30 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
