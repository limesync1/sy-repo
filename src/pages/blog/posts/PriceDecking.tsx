import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "terrassebygning-pris-pr-m2-2026",
  keywords: "terrasse bygge pris pr m2 2026, ny terrasse pris, træterrasse pris",
  faq: [
    { q: "Hvad koster en ny terrasse pr. m²?", a: "Trykimprægneret: 750–1.250 kr./m². Hårdttræ (ipe/cumaru): 1.450–2.495 kr./m². Komposit: 1.250–2.295 kr./m²." },
    { q: "Skal jeg lave fundament?", a: "Ja — typisk betonsko eller skruefundamenter, 695–1.495 kr./m² ekstra." },
    { q: "Hvor lang tid tager det?", a: "20 m² terrasse: 2–4 dage for ét hold på to." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — opbygning på helårsbolig giver 25% retur på arbejdsløn." },
  ],
  sections: [
    { heading: "Pris pr. m² komplet inkl. arbejde", list: ["Trykimprægneret fyrretræ: 750–1.250 kr.","Lærk: 1.150–1.795 kr.","Ipe/Cumaru hårdttræ: 1.450–2.495 kr.","Komposit (WPC): 1.250–2.295 kr."] },
    { heading: "Tillæg", list: ["Fundament: 695–1.495 kr./m².","Trappe/podie: 4.500–9.500 kr.","Skjult skruning: +95–195 kr./m².","Pergola/overdækning: 2.500–6.500 kr./m²."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/toemrer-timepris-2026">Pris på tømrer pr. time</Link></li>
        <li key="l1"><Link to="/blog/indkoersel-belaegning-pris-pr-m2-2026">Pris på indkørselsbelægning</Link></li>
        <li key="l2"><Link to="/toemrer">Find tømrer</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
