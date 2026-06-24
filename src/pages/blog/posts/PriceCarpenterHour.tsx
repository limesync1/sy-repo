import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "toemrer-timepris-2026",
  keywords: "tømrer timepris 2026, tømrer pris pr time, tømrer pris",
  faq: [
    { q: "Hvad koster en tømrer pr. time?", a: "495–745 kr./time inkl. moms. Mester typisk 595–745 kr., svend uden mester 495–595 kr." },
    { q: "Er der minimumsudkald?", a: "Ja — typisk 1 times kørsel + 1 time arbejde, eller minimum 895–1.495 kr." },
    { q: "Fast pris eller timepris?", a: "Fast pris på defineret opgave (vinduesudskift, terrasse). Timepris ved fejlfinding og reparation." },
    { q: "Er tømrerarbejde BoligJob-berettiget?", a: "Ja — al tømrerservice på helårsbolig giver 25% retur på arbejdsløn." },
  ],
  sections: [
    { heading: "Regionale priser inkl. moms", list: ["København + omegn: 645–745 kr./time.","Aarhus: 595–695 kr./time.","Odense + Aalborg: 565–665 kr./time.","Provins: 495–625 kr./time."] },
    { heading: "Typiske faste priser", list: ["Skifte 1 vindue: 2.500–6.500 kr.","Lægge terrasse 20 m²: 18.000–32.000 kr.","Nye indvendige døre: 1.800–3.500 kr./stk.","Skifte tagrende 10 m: 4.500–8.500 kr."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/goer-det-selv-vs-haandvaerker">Hvornår skal du hyre håndværker?</Link></li>
        <li key="l1"><Link to="/blog/koekken-montering-pris-2026">Pris på køkkenmontering</Link></li>
        <li key="l2"><Link to="/toemrer">Find tømrer</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
