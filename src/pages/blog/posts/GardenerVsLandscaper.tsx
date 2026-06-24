import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "havemand-vs-anlaegsgartner",
  keywords: "havemand vs anlægsgartner, forskel havemand anlægsgartner, hvilken havefagperson",
  faq: [
    { q: "Hvad er forskellen?", a: "Havemand = drift og vedligehold (græs, hæk, ukrudt). Anlægsgartner = nyanlæg og design (terrasser, dræn, bede, plantning af træer)." },
    { q: "Hvem er dyrest?", a: "Anlægsgartner: 425–650 kr./t. Havemand: 285–495 kr./t. Anlægsgartner kræver længere uddannelse og dyrere udstyr." },
    { q: "Skal jeg bruge begge?", a: "Ofte ja — anlægsgartner anlægger have/terrasse, havemand vedligeholder den efterfølgende. Mange firmaer tilbyder begge." },
  ],
  sections: [
    { heading: "Havemand — typisk arbejde", list: [
      "Græsslåning (ugentlig/14-dags).",
      "Hækklipning (2× årligt).",
      "Lugning og bedrenhold.",
      "Bortskaffelse af haveaffald.",
      "Snerydning vintersæson.",
    ]},
    { heading: "Anlægsgartner — typisk arbejde", list: [
      "Anlæg af fliseterrasse.",
      "Træterrasse og opbygning.",
      "Dræn og regnvandshåndtering.",
      "Hækplantning og store træer.",
      "Havedesign og bedeplaner.",
    ]},
    { heading: "Læs også", list: [
      <a href="/priser/haveservice">Haveservice prisguide 2026</a>,
      <a href="/priser/anlaegsgartner">Anlægsgartner prisguide 2026</a>,
      <a href="/blog/vinterklargoering-af-have">Vinterklargøring af haven</a>,
    ]},
  ],
});
export default Post;