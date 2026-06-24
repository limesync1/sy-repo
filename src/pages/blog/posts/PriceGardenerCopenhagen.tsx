import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "havemand-pris-koebenhavn-2026",
  keywords: "havemand pris København 2026, haveservice københavn, gartner pris kbh",
  faq: [
    { q: "Hvad koster en havemand i København?", a: "Timepris 365–595 kr. inkl. moms før BoligJob. Efter fradrag reelt 275–445 kr./time." },
    { q: "Hvad koster en fast pakke?", a: "Lille have: 12.500–22.500 kr./år. Mellem: 22.500–42.500 kr. Stor parcelhushave: 35.000–65.000 kr." },
    { q: "Er BoligJob-fradrag muligt?", a: "Ja — al havearbejde på helårsbolig giver 25% retur på arbejdsløn op til 12.900 kr./person/år." },
    { q: "Hvilke områder dækker København?", a: "Hele Storkøbenhavn — fra Frederiksberg til Lyngby, Gentofte, Hvidovre, Ballerup og Greve." },
  ],
  sections: [
    { heading: "Timepris pr. bydel/zone (Storkøbenhavn)", list: ["København K + Frederiksberg: 495–595 kr.","Vesterbro, Nørrebro, Østerbro: 445–545 kr.","Hellerup, Charlottenlund, Lyngby: 465–565 kr.","Vestegnen (Glostrup, Hvidovre): 395–495 kr.","Sydsjælland (Greve, Solrød): 365–465 kr."] },
    { heading: "Pakkepriser i KBH 2026", list: ["Plæneklipning + hækklipning 2× årligt: 6.500–14.500 kr.","Sæsonpakke (forår + efterår klargøring): 4.500–9.500 kr.","Helårspleje (12 besøg): 22.500–48.500 kr."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/haveservice-pris-aarhus-2026">Sammenlign med Aarhus-priser</Link></li>
        <li key="l1"><Link to="/blog/hvad-koster-haveservice-pr-time-2026">Pris på haveservice pr. time</Link></li>
        <li key="l2"><Link to="/haveservice/koebenhavn">Find haveservice i København</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
