import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "beskaering-af-roser",
  keywords: "beskæring af roser, beskære roser, hvornår beskære roser, klatreroser beskæring, buskroser",
  faq: [
    { q: "Hvornår skal roser beskæres?", a: "Den store beskæring sker i foråret, typisk i april, når forsythiaen blomstrer og den værste frost er overstået." },
    { q: "Hvor meget skal klippes af?", a: "Buskroser klippes ned til 3–5 kraftige knopper. Klatreroser beskæres let — sidegrene kortes ind." },
  ],
  sections: [
    { paragraphs: [
      "Roser blomstrer på nye skud. Derfor giver en god beskæring i foråret flere og større blomster — og en sundere plante.",
    ] },
    { heading: "Grundreglerne", list: [
      "Brug en skarp, ren rosensaks.",
      "Klip skråt ca. ½ cm over en udadvendt knop.",
      "Fjern døde, syge og krydsende grene først.",
    ] },
    { heading: "Pr. rosetype", list: [
      "Storblomstrede og buketroser: klip ned til 3–5 knopper.",
      "Klatreroser: behold hovedgrene, kort sidegrene ind.",
      "Bunddækkeroser: klip ned med hækkesaks hvert par år.",
      "Engangsblomstrende roser: beskær lige efter blomstring.",
    ] },
    { heading: "Sommerpleje", list: [
      "Klip visne blomster af, så der kommer nye.",
      "Vand ved roden, ikke på bladene.",
    ] },
    { body: (
      <p>
        <a href="/guides/have">Guide til havemand</a> · <a href="/blog/beskaering-af-frugttraeer">beskæring af frugttræer</a> · <a href="/tilbud">Indhent gratis tilbud fra en havemand</a>.
      </p>
    ) },
  ],
});
