import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "tomrer-vs-snedker",
  keywords: "tømrer vs snedker, forskel tømrer snedker, hvornår tømrer eller snedker",
  faq: [
    { q: "Hvad er den korte forskel?", a: "Tømrer = byggeri og konstruktion (tag, gulv, vægge, terrasse). Snedker = møbler og finarbejde (køkken, døre, indbyggede skabe, finerede flader)." },
    { q: "Hvem er dyrest?", a: "Snedker er typisk 50–100 kr./time dyrere pga. specialiseret håndværk og finere materialer. Tømrer: 425–595 kr./t. Snedker: 495–695 kr./t." },
    { q: "Hvem laver mit nye køkken?", a: "Et standard IKEA/HTH-køkken kan en tømrer montere. Skræddersyet køkken i massivt træ → snedker." },
    { q: "Hvad med vinduer og døre?", a: "Standardvinduer og -døre: tømrer. Specialfremstillede døre/vinduer i træ: snedker." },
  ],
  sections: [
    { heading: "Tømrer — typiske opgaver", list: [
      "Tagkonstruktion, spær, undertag.",
      "Trægulve (oplægning).",
      "Vægge, lofter, gipsarbejde.",
      "Terrasser, hegn, carport.",
      "Montering af præfabrikerede køkkener/skabe.",
    ]},
    { heading: "Snedker — typiske opgaver", list: [
      "Skræddersyede køkkener i træ.",
      "Indbyggede skabe og vægge.",
      "Specialdesignede døre og vinduer.",
      "Trapper i massivt træ.",
      "Møbelreparation og restaurering.",
    ]},
    { heading: "Læs også", list: [
      <a href="/priser/tomrer">Tømrer prisguide 2026</a>,
      <a href="/blog/mason-vs-tomrer">Murer vs. tømrer — hvem skal du bruge?</a>,
      <a href="/blog/koekkenmontering-pris-2026">Køkkenmontering pris 2026</a>,
    ]},
  ],
});
export default Post;