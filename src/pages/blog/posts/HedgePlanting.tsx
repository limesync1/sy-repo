import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "plant-haek",
  keywords: "plant hæk, plante hæk, hæk afstand, bøgehæk, ligusterhæk, hækplanter",
  faq: [
    { q: "Hvornår skal man plante hæk?", a: "Barrodsplanter plantes i bladløs tilstand, typisk oktober–april. Potteplanter kan plantes det meste af året." },
    { q: "Hvor tæt skal planterne stå?", a: "Typisk 3–5 planter pr. meter afhængigt af art og størrelse." },
  ],
  sections: [
    { paragraphs: [
      "En hæk er en investering for mange år. Vælg den rigtige plante, og giv den en god start — så bliver den tæt hurtigere.",
    ] },
    { heading: "Populære hækplanter", list: [
      "Bøg: holder de visne blade om vinteren.",
      "Avnbøg: tåler mere skygge og fugt.",
      "Liguster: hurtig og næsten stedsegrøn.",
      "Taks: stedsegrøn og tæt, men langsom.",
    ] },
    { heading: "Sådan planter du", ordered: [
      "Grav en rende og løsn jorden godt.",
      "Bland kompost i.",
      "Sæt planterne i samme dybde som før.",
      "Træd fast og vand grundigt.",
      "Klip toppen let, så hækken forgrener sig.",
    ] },
    { heading: "Det første år", list: [
      "Vand i tørre perioder.",
      "Hold renden fri for ukrudt.",
      "Klip let 1–2 gange.",
    ] },
    { body: (
      <p>
        <a href="/blog/hvad-koster-haekklipning">Hvad koster hækklipning</a> · <a href="/blog/haek-og-traefaeldning-regler">regler for hæk</a> · <a href="/guides/have">Guide til havemand</a> · <a href="/tilbud">Indhent gratis tilbud fra en havemand</a>.
      </p>
    ) },
  ],
});
