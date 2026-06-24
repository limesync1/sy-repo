import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "carport-opstilling-pris-2026",
  keywords: "carport opstilling pris 2026, ny carport pris, dobbeltcarport pris",
  faq: [
    { q: "Hvad koster en carport?", a: "Enkeltcarport: 35.000–65.000 kr. Dobbeltcarport: 55.000–95.000 kr. Med redskabsrum: +15.000–35.000 kr." },
    { q: "Skal jeg søge byggetilladelse?", a: "Op til 50 m² uden bolig kan typisk anmeldes (ikke ansøges) — men tjek altid kommunens lokalplan." },
    { q: "Hvor lang tid tager opstilling?", a: "3–7 arbejdsdage afhængigt af størrelse og fundament." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — 25% retur på arbejdsløn på opstilling." },
  ],
  sections: [
    { heading: "Pris pr. type komplet", list: ["Enkeltcarport 15 m²: 35.000–55.000 kr.","Dobbeltcarport 30 m²: 55.000–85.000 kr.","Carport + redskabsrum: 65.000–105.000 kr.","Carport + indgangsparti: 75.000–125.000 kr."] },
    { heading: "Tillæg", list: ["Punktfundament + støbning: 4.500–9.500 kr.","Asfalt under carport: 395–795 kr./m².","El-stik + lys: 3.500–8.500 kr.","Maling/beklædning: 95–185 kr./m²."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/toemrer-timepris-2026">Pris på tømrer pr. time</Link></li>
        <li key="l1"><Link to="/blog/terrassebygning-pris-pr-m2-2026">Pris på terrassebygning</Link></li>
        <li key="l2"><Link to="/toemrer">Find tømrer</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
