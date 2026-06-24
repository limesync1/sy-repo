import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "rengoering-koebenhavn-pris-2026",
  keywords: "rengøring København pris, rengøringshjælp kbh pris",
  faq: [
    { q: "Hvad koster fast rengøringshjælp i København?", a: "345–425 kr./time inkl. moms før BoligJob. Efter fradrag reelt 260–320 kr./time." },
    { q: "Hvad koster engangsrengøring (90 m²)?", a: "1.495–2.495 kr. for 4–6 timer inkl. moms." },
    { q: "Er der minimum-tid?", a: "Ja — typisk 2 timer eller 695–895 kr." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — 25% retur på arbejdsløn op til 12.900 kr./person/år." },
  ],
  sections: [
    { heading: "Pris pr. bydel/zone", list: ["Indre By + Frederiksberg: 395–425 kr./time.","Vesterbro/Nørrebro/Østerbro: 365–405 kr./time.","Hellerup + Lyngby: 385–425 kr./time.","Vestegnen: 325–375 kr./time."] },
    { heading: "Faste pakker (90 m² hjem)", list: ["2 t hver 14. dag: 1.580–1.700 kr./md.","3 t ugentligt: 4.350–5.100 kr./md.","Efter BoligJob (par): 990–3.190 kr./md."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/privatrengoering-pris-pr-time">Privatrengøring pris pr. time</Link></li>
        <li key="l1"><Link to="/blog/saadan-vaelger-du-rengoeringsfirma">Sådan vælger du rengøringsfirma</Link></li>
        <li key="l2"><Link to="/rengoering/koebenhavn">Find rengøring i København</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
