import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "haandvaerker-koebenhavn-timepris-2026",
  keywords: "håndværker København timepris 2026, allround håndværker pris kbh",
  faq: [
    { q: "Hvad koster en handyman i København?", a: "495–695 kr./time inkl. moms for allround. Specialer som elektriker/VVS dyrere." },
    { q: "Hvad er forskellen på fagmand og handyman?", a: "Handyman: småjobs som montering, mindre reparationer. Fagmand: certificeret til specifik branche (el, VVS, murer)." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — al arbejde på helårsbolig giver 25% retur på arbejdsløn." },
    { q: "Hvad koster udkald?", a: "Typisk 1 t kørsel + minimum 1 t arbejde — eller fast 895–1.395 kr." },
  ],
  sections: [
    { heading: "Timepris pr. bydel", list: ["Indre By + Frederiksberg: 595–695 kr.","Vesterbro/Nørrebro: 545–645 kr.","Hellerup + Charlottenlund: 595–695 kr.","Vestegnen: 495–595 kr."] },
    { heading: "Typiske faste priser", list: ["Hænge billede/spejl op (5 stk.): 750–1.295 kr.","Samle IKEA-skab (PAX): 1.295–2.495 kr.","Skifte 5 stikkontakter (m. elektriker): 1.795–2.995 kr.","Skifte vandhane: 695–1.495 kr."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/goer-det-selv-vs-haandvaerker">DIY vs. håndværker</Link></li>
        <li key="l1"><Link to="/blog/toemrer-timepris-2026">Tømrer timepris</Link></li>
        <li key="l2"><Link to="/haandvaerker/koebenhavn">Find håndværker i København</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
