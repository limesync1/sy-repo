import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "privatrengoering-pris-pr-time",
  keywords: "privatrengøring pris pr time, rengøring timepris 2026, fast rengøringshjælp pris",
  faq: [
    { q: "Hvad koster privatrengøring pr. time?", a: "265–425 kr./time inkl. moms før BoligJob. Efter fradrag reelt 200–320 kr./time." },
    { q: "Hvor mange timer til 90 m²?", a: "2–3 timer pr. besøg hver 14. dag holder en almindelig 90 m² lejlighed." },
    { q: "Er der abonnementsrabat?", a: "Ja — fast hver 14. dag giver typisk 10–25% rabat ift. engangsrengøring." },
    { q: "Er privatrengøring BoligJob-berettiget?", a: "Ja — 25% retur på arbejdsløn op til 12.900 kr./person/år i 2026." },
  ],
  sections: [
    { heading: "Regionale timepriser inkl. moms", list: ["København: 345–425 kr.","Aarhus: 295–375 kr.","Odense + Aalborg: 275–345 kr.","Mindre byer + provins: 265–315 kr."] },
    { heading: "Totalpris månedligt (90 m²)", list: ["Hver 14. dag, 2 t: 1.180–1.700 kr./md.","Ugentligt, 2 t: 2.360–3.400 kr./md.","Efter BoligJob (par): 740–1.060 kr./md."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/robotstoevsuger-vs-rengoeringshjaelp">Robot vs. rengøringshjælp</Link></li>
        <li key="l1"><Link to="/blog/hvad-koster-flytterengoering-2026">Pris på flytterengøring</Link></li>
        <li key="l2"><Link to="/rengoering">Find rengøring i din by</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
