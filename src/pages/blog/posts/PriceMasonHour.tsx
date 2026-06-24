import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "murer-pris-pr-time-2026",
  keywords: "murer pris pr time 2026, murer timepris, murer pris fuger",
  faq: [
    { q: "Hvad koster en murer pr. time?", a: "525–765 kr./time inkl. moms i 2026." },
    { q: "Hvad koster nye fuger?", a: "Ud-fugning + nyfugning af facade: 285–525 kr./m². Indvendige fuger 145–245 kr./m²." },
    { q: "Hvad koster et nyt badeværelse hos murer?", a: "Mureretape af 5 m² badeværelse: 28.000–55.000 kr. (uden VVS og maler)." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — al murerarbejde på helårsbolig giver 25% retur på arbejdsløn." },
  ],
  sections: [
    { heading: "Regionale timepriser", list: ["København: 685–765 kr.","Aarhus: 625–695 kr.","Odense + Aalborg: 595–665 kr.","Provins: 525–625 kr."] },
    { heading: "Faste priser på typisk arbejde", list: ["Ud-fugning facade pr. m²: 285–525 kr.","Sokkelpuds 20 m²: 8.500–16.500 kr.","Nyt skorstensindfor: 12.000–28.000 kr.","Tilmuring af dør: 4.500–8.500 kr."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/flisemontoer-pris-pr-m2-2026">Pris på flisemontør</Link></li>
        <li key="l1"><Link to="/blog/badevaerelse-renovering-pris-2026">Pris på badeværelsesrenovering</Link></li>
        <li key="l2"><Link to="/murer">Find murer</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
