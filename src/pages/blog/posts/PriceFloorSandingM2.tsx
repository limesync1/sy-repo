import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "gulvslibning-pris-pr-m2-2026",
  keywords: "gulvslibning pris pr m2 2026, parketslibning pris, lakeret gulv pris",
  faq: [
    { q: "Hvad koster gulvslibning pr. m²?", a: "215–395 kr./m² inkl. moms — slib + 2 lag lak eller olie." },
    { q: "Er olie eller lak dyrest?", a: "Olie er typisk 20–50 kr./m² billigere end lak, men kræver vedligehold hvert 1.–2. år." },
    { q: "Hvor lang tid tager det?", a: "30 m² stue: 1,5–2 dage inkl. tørretid. Ikke til at gå på i 24–48 timer efter sidste lag." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — gulvslibning på helårsbolig giver 25% retur på arbejdsløn." },
  ],
  sections: [
    { heading: "Pris pr. m² komplet (inkl. lak/olie)", list: ["Slib + 2 lag lak: 245–395 kr./m².","Slib + olie 1 lag: 215–325 kr./m².","Spartling af huller: +25–55 kr./m².","Speciel-bejdsning: +75–145 kr./m²."] },
    { heading: "Sådan sparer du penge", list: ["Saml flere rum i ét besøg.","Vælg standard-mat lak (ikke specialfarve).","Flyt møbler selv.","Acceptér 2 lag i stedet for 3."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/hvor-mange-gange-slibe-traegulv">Hvor mange gange kan trægulv slibes?</Link></li>
        <li key="l1"><Link to="/blog/gulvlaegning-pris-pr-m2-2026">Pris på ny gulvlægning</Link></li>
        <li key="l2"><Link to="/gulvlaegger">Find gulvlægger</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
