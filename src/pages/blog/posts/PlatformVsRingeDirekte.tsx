import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "platform-vs-ringe-direkte-til-firma",
  keywords: "ringe direkte til håndværker eller bruge platform, indhente tilbud selv, find lokalt firma selv, serviceydere alternativ",
  faq: [
    { q: "Er det billigere at ringe direkte til et firma?", a: "Ikke nødvendigvis. Prisen sættes af firmaet og af opgavens omfang. Fordelen ved at indhente flere tilbud er, at du ser prisspændet — og opdager hvis et tilbud mangler noget væsentligt." },
    { q: "Hvad er fordelen ved at ringe direkte?", a: "Du kan komme hurtigt i gang, hvis du allerede kender et firma, du stoler på, og opgaven haster." },
    { q: "Hvad er fordelen ved en platform?", a: "Du beskriver opgaven én gang og når flere relevante firmaer i dit område, og du får tilbuddene på skrift så de kan sammenlignes." },
    { q: "Hvor mange firmaer bør jeg kontakte?", a: "Tre er en fornuftig tommelfingerregel på opgaver af en vis størrelse." },
    { q: "Kan jeg gøre begge dele?", a: "Ja. Mange henter et par tilbud via en platform og supplerer med et firma, de kender i forvejen." },
  ],
  sections: [
    {
      paragraphs: [
        "Nogle gange er den hurtigste vej at ringe til det firma, naboen brugte. Andre gange betaler det sig at bruge ti minutter på at beskrive opgaven ét sted og lade firmaerne komme til dig.",
      ],
    },
    {
      heading: "Ring direkte når…",
      list: [
        "Det haster (vandskade, akut fejl, lås).",
        "Du har brugt firmaet før og er tilfreds.",
        "Opgaven er lille og prisen forudsigelig.",
      ],
    },
    {
      heading: "Brug en platform når…",
      list: [
        "Du ikke kender nogen i faget.",
        "Opgaven er stor nok til at prisforskelle betyder noget.",
        "Du vil have tilbuddene på skrift og sammenligne indhold.",
        "Du skal bruge flere fag eller en løbende aftale.",
      ],
      body: (
        <p className="text-sm">
          <a href="/tilbud">Beskriv opgaven én gang</a> — eller find selv en udbyder under{" "}
          <a href="/virksomheder">serviceudbydere</a>.
        </p>
      ),
    },
    {
      heading: "Læs også",
      list: [
        <a href="/blog/bedste-platform-til-haandvaerkertilbud-2026">Oversigt: bedste platform til tilbud i 2026</a>,
        <a href="/blog/serviceydere-vs-facebook-grupper">Serviceydere vs. Facebook-grupper</a>,
        <a href="/blog/fast-pris-vs-timepris">Fast pris vs. timepris</a>,
      ],
    },
  ],
});
export default Post;
