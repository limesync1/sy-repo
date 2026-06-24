import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "flisemontoer-pris-pr-m2-2026",
  keywords: "flisemontør pris pr m2 2026, fliser læggepris, fliser badeværelse pris",
  faq: [
    { q: "Hvad koster en flisemontør pr. m²?", a: "Gulv 595–895 kr./m², væg 695–995 kr./m², mosaik 1.250–1.850 kr./m² (uden fliser)." },
    { q: "Er der minimumspris?", a: "Ja — typisk 6.500–9.500 kr. for mindre badeværelse, da klargøring + opstart udgør faste timer." },
    { q: "Skal underlaget også betales?", a: "Som regel inkluderet — vådrumsmembran og afretning kommer oveni hvis underlaget er ringe." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — fliselægning på helårsbolig giver 25% retur på arbejdsløn." },
  ],
  sections: [
    { heading: "Pris pr. m² inkl. moms (uden fliser)", list: ["Gulvfliser (30×60+): 595–795 kr.","Gulvfliser (små <20×20): 745–895 kr.","Vægfliser: 695–995 kr.","Mosaik: 1.250–1.850 kr.","Storformat 60×120+: 895–1.450 kr."] },
    { heading: "Tillæg du skal regne med", list: ["Vådrumsmembran: 145–285 kr./m².","Afretning af gulv: 95–285 kr./m².","Fjernelse af gamle fliser: 195–395 kr./m².","Diamantskåret tilpasning: 350–895 kr./vask/toilet."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/murer-pris-pr-time-2026">Pris på murer pr. time</Link></li>
        <li key="l1"><Link to="/blog/badevaerelse-renovering-pris-2026">Pris på badeværelsesrenovering</Link></li>
        <li key="l2"><Link to="/murer">Find flisemontør</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
