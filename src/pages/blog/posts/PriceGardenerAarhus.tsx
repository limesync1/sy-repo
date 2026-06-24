import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "haveservice-pris-aarhus-2026",
  keywords: "haveservice pris Aarhus 2026, gartner aarhus pris, havemand aarhus",
  faq: [
    { q: "Hvad koster haveservice i Aarhus?", a: "Timepris 295–495 kr. inkl. moms — 15–25% billigere end København." },
    { q: "Hvilke områder dækker?", a: "Aarhus C, Risskov, Højbjerg, Brabrand, Tilst, Lystrup, Beder, Skanderborg-grænsen." },
    { q: "Er der abonnementsrabat?", a: "Ja — fast aftale giver typisk 15–25% rabat ift. engangsbesøg." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — 25% retur på arbejdsløn op til 12.900 kr./person." },
  ],
  sections: [
    { heading: "Timepris pr. zone i Aarhus", list: ["Aarhus C: 395–495 kr.","Risskov + Skåde: 395–475 kr.","Højbjerg + Holme: 365–445 kr.","Brabrand + Tilst: 325–425 kr.","Lystrup + Beder: 295–395 kr."] },
    { heading: "Pakkepriser 2026", list: ["Plæneklipning 14 besøg/sæson: 5.500–11.500 kr.","Hækklipning 2× årligt: 2.500–5.500 kr.","Helårspakke parcelhushave: 18.500–38.500 kr."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/havemand-pris-koebenhavn-2026">Sammenlign med København</Link></li>
        <li key="l1"><Link to="/blog/haekkeklipning-pris-pr-meter-2026">Pris på hækkeklipning</Link></li>
        <li key="l2"><Link to="/haveservice/aarhus">Find haveservice i Aarhus</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
