import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "beskaering-af-frugttraeer",
  keywords: "beskæring af frugttræer, beskære æbletræ, beskære kirsebærtræ, beskæring blommetræ, hvornår beskære frugttræer",
  faq: [
    { q: "Hvornår beskærer man æbletræer?", a: "Æble og pære beskæres typisk i vinterhalvåret, når træet er bladløst, eller let om sommeren." },
    { q: "Hvornår beskæres kirsebær og blomme?", a: "Om sommeren efter høst. Stenfrugt beskæres ikke om vinteren pga. risiko for sygdom." },
  ],
  sections: [
    { paragraphs: [
      "Et beskåret frugttræ giver mere og bedre frugt, og er lettere at høste. Det vigtigste er at kende tidspunktet for hver træsort.",
    ] },
    { heading: "Tidspunkter", list: [
      "Æble og pære: vinter (bladløs) eller let sommerbeskæring.",
      "Kirsebær og blomme: sommer, efter høst.",
      "Ingen beskæring i frost.",
    ] },
    { heading: "Sådan gør du", ordered: [
      "Fjern døde, syge og skadede grene.",
      "Fjern grene, der krydser eller vokser indad.",
      "Fjern vandskud, der skyder lige op.",
      "Åbn kronen, så lys og luft kommer ind.",
      "Klip lige uden for grenkraven — lad ingen stumper stå.",
    ] },
    { body: (
      <p>
        <a href="/guides/have">Guide til havemand</a> · <a href="/blog/beskaering-af-roser">beskæring af roser</a> · <a href="/blog/haek-og-traefaeldning-regler">regler for træfældning</a> · <a href="/tilbud">Indhent gratis tilbud fra en havemand</a>.
      </p>
    ) },
  ],
});
