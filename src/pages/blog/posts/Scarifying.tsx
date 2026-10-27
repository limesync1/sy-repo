import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "vertikalskaering-guide",
  keywords: "vertikalskæring, vertikalskære plæne, mos i plænen, hvornår vertikalskære, vertikalskærer",
  faq: [
    { q: "Hvornår skal man vertikalskære?", a: "Bedst i foråret (april–maj) eller tidligt efterår, når græsset vokser godt og jorden er fugtig, men ikke våd." },
    { q: "Hvor dybt skal kniven stå?", a: "Kun få millimeter ned i jorden. Kniven skal rive mos og filt op — ikke pløje plænen." },
  ],
  sections: [
    { paragraphs: [
      "Vertikalskæring river mos og filt op af plænen, så luft, vand og gødning kan komme ned til rødderne. Plænen ser ramponeret ud bagefter — men kommer tættere og grønnere igen.",
    ] },
    { heading: "Trin for trin", ordered: [
      "Slå græsset kort et par dage før.",
      "Vertikalskær i to retninger på kryds.",
      "Rive mos og filt sammen og fjern det.",
      "Gød plænen.",
      "Eftersa bare pletter med græsfrø.",
      "Vand, hvis det er tørt.",
    ] },
    { heading: "Undgå", list: [
      "At vertikalskære i tørke eller frost.",
      "For dyb indstilling.",
      "At gøre det på nyanlagt plæne.",
    ] },
    { body: (
      <p>
        <a href="/guides/have">Guide til havemand</a> · <a href="/blog/graesslaaning-guide">græsslåning</a> · <a href="/priser/haveservice">haveservice pris</a> · <a href="/tilbud">Indhent gratis tilbud fra en havemand</a>.
      </p>
    ) },
  ],
});
