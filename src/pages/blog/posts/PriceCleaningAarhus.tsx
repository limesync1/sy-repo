import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "rengoering-aarhus-pris-2026",
  keywords: "rengøring Aarhus pris, rengøringshjælp aarhus pris",
  faq: [
    { q: "Hvad koster rengøringshjælp i Aarhus?", a: "295–375 kr./time inkl. moms. 10–20% billigere end København." },
    { q: "Engangsrengøring 90 m²?", a: "1.195–2.095 kr. inkl. moms." },
    { q: "Hvilke områder dækker?", a: "Aarhus C, Risskov, Højbjerg, Brabrand, Lystrup, Beder, Tilst." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — 25% retur på arbejdsløn." },
  ],
  sections: [
    { heading: "Pris pr. bydel", list: ["Aarhus C: 345–375 kr./time.","Risskov + Skåde: 325–365 kr./time.","Højbjerg + Holme: 305–345 kr./time.","Lystrup + Beder: 295–325 kr./time."] },
    { heading: "Pakkepriser månedligt", list: ["2 t hver 14. dag: 1.180–1.500 kr.","3 t ugentligt: 3.540–4.500 kr.","Efter BoligJob (par): 740–2.820 kr."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/rengoering-koebenhavn-pris-2026">Sammenlign med København</Link></li>
        <li key="l1"><Link to="/blog/hvor-ofte-rengoering">Hvor ofte skal du gøre rent?</Link></li>
        <li key="l2"><Link to="/rengoering/aarhus">Find rengøring i Aarhus</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
