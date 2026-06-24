import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "udskift-doer-pris-2026",
  keywords: "udskift dør pris 2026, ny hoveddør pris, indvendig dør pris",
  faq: [
    { q: "Hvad koster ny hoveddør installeret?", a: "12.500–35.000 kr. inkl. montering. Sikkerhedsdør: 22.000–45.000 kr." },
    { q: "Hvad koster ny indvendig dør?", a: "1.800–4.500 kr./stk. inkl. montering med karm." },
    { q: "Skal hele karmen skiftes?", a: "Ofte ja ved hoveddør (eller minimum karmtilpasning). Indvendige døre kan ofte sættes i eksisterende karm hvis mål passer." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — 25% retur på arbejdsløn." },
  ],
  sections: [
    { heading: "Pris efter dørtype", list: ["Indvendig massiv standarddør: 1.800–4.500 kr.","Indvendig glasdør: 3.500–7.500 kr.","Hoveddør træ standard: 12.500–22.000 kr.","Hoveddør sikkerheds- (RC2/RC3): 22.000–45.000 kr.","Skydedør med glas: 8.500–18.500 kr."] },
    { heading: "Tillæg", list: ["Demontering gammel dør: 595–1.295 kr.","Karmtilpasning: 1.500–3.500 kr.","Justering af gulvtærskel: 695–1.495 kr.","Indvendig efter-arbejde + maler: 1.500–3.500 kr."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/laasesmed-pris-doeraabning-2026">Pris på låsesmed</Link></li>
        <li key="l1"><Link to="/blog/toemrer-timepris-2026">Tømrer timepris</Link></li>
        <li key="l2"><Link to="/toemrer">Find tømrer</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
