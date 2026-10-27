import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "dinero-faktura-servicefirma",
  keywords: "dinero faktura, dinero integration, dinero servicefirma, automatisk faktura dinero",
  faq: [
    { q: "Virker det med Dinero?", a: "Ja. Serviceydere kan forbindes med Dinero, så udførte besøg faktureres automatisk." },
  ],
  sections: [
    { paragraphs: [
      "Dinero er populært blandt mindre servicefirmaer. Har du faste kunder, kan fakturaerne laves automatisk ud fra de besøg, der faktisk er udført.",
    ] },
    { heading: "Sådan kommer du i gang", ordered: [
      "Forbind Dinero under Regnskab.",
      "Vælg standard for fakturering — efter hvert besøg eller samlet.",
      "Markér besøg som udført på ruten.",
      "Fakturaen oprettes i Dinero.",
    ] },
    { heading: "Hvorfor det betyder noget", list: [
      "Du fakturerer det, der blev lavet — ikke det, der var planlagt.",
      "Ingen manuel indtastning.",
      "Hurtigere betaling, fordi fakturaen kommer med det samme.",
    ] },
    { body: (
      <p>
        <a href="/blog/economic-integration-servicefirma">e-conomic integration</a> <a href="/blog/faktura-skabelon-servicefirma">faktura skabelon</a>. <a href="/blog/proev-ruteplanlaegger-gratis">Prøv Serviceydere gratis i 14 dage</a> — uden kreditkort.
      </p>
    ) },
  ],
});
