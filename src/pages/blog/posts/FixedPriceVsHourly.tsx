import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "fast-pris-vs-timepris",
  keywords: "fast pris vs timepris, håndværker fast pris, timepris håndværker, hvad er bedst",
  faq: [
    { q: "Hvornår er fast pris bedst?", a: "Når opgaven er veldefineret: nyt køkken, malet stue, ny terrasse. Du kender slutprisen og firmaet bærer risikoen for forsinkelser." },
    { q: "Hvornår er timepris bedst?", a: "Ved diagnose-opgaver (VVS-fejlfinding, el-problemer), løbende rengøring, eller når opgavens omfang er uklart." },
    { q: "Er fast pris altid dyrere?", a: "Typisk 10–20% dyrere på papiret — firmaet lægger en risiko-buffer ind. Men du undgår overskridelser, der ofte løber op i 30–50% over estimat." },
    { q: "Hvad med tilbud uden besigtigelse?", a: "Fast pris uden besigtigelse er ofte upålideligt — bed altid om en besigtigelse på opgaver over 10.000 kr." },
  ],
  sections: [
    { heading: "Fast pris — fordele og ulemper", list: [
      "+ Du kender slutprisen før start.",
      "+ Firmaet bærer risikoen for forsinkelser.",
      "+ Nem at sammenligne tilbud på.",
      "− Typisk 10–20% dyrere som buffer.",
      "− Kræver besigtigelse for at være troværdig.",
    ]},
    { heading: "Timepris — fordele og ulemper", list: [
      "+ Du betaler kun for faktisk arbejde.",
      "+ God til ukendte/diagnose-opgaver.",
      "+ Fleksibel ved ændringer undervejs.",
      "− Slutpris er usikker.",
      "− Sværere at sammenligne tilbud.",
    ]},
    { heading: "Hvornår hvilken?", paragraphs: [
      "Tommelfingerregel: kender du opgavens omfang (kvm, antal vinduer, beskrivelse) → fast pris. Er det fejlfinding eller løbende drift → timepris.",
    ]},
    { heading: "Læs også", list: [
      <a href="/priser/haandvaerker">Håndværker prisguide 2026</a>,
      <a href="/blog/timepris-havemand-2026">Timepris havemand</a>,
      <a href="/blog/serviceydere-vs-happyhelper">Serviceydere vs. Happyhelper</a>,
    ]},
  ],
});
export default Post;