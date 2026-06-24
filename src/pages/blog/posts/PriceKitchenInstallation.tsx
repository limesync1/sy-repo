import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "koekken-montering-pris-2026",
  keywords: "køkkenmontering pris 2026, montering nyt køkken, snedker køkken pris",
  faq: [
    { q: "Hvad koster montering af nyt køkken?", a: "12.000–32.000 kr. for selve monteringen (uden køkken). Med el, VVS og bordpladeudskæring: 22.000–55.000 kr." },
    { q: "Er IKEA-montering billigere?", a: "IKEA-monteringsservice 5.500–12.500 kr. for standard 3 m køkken. Snedker kan håndtere tilpasninger, men koster 10.000–25.000 kr. mere." },
    { q: "Hvad koster bordpladen monteret?", a: "Laminat: gratis op til 2,4 m. Komposit/sten: 1.500–4.500 kr. for udskæring + montering." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — arbejdsløn er fradragsberettiget. Materialer (køkkenet selv) er IKKE." },
  ],
  sections: [
    { heading: "Pris-bod typisk 3 m køkken", list: ["Montering af skabe + låger: 8.500–18.500 kr.","Bordpladeudskæring + montering: 1.500–4.500 kr.","VVS-tilslutning (vask, opvasker): 2.500–5.500 kr.","El-tilslutning (ovn, plader, lys): 3.500–8.500 kr.","Aftrækskanal: 1.500–4.500 kr.","Vægbeklædning bag bordplade: 1.500–4.500 kr.","TOTAL inkl. arbejde: 19.000–46.000 kr."] },
    { heading: "Sådan halverer du regningen", list: ["Vælg IKEA-monteringsservice ved standard.","Behold gammel placering af stik og afløb.","Køb bordplade fra køkkenleverandør.","Saml VVS, el og snedker hos samme firma."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/toemrer-timepris-2026">Pris på tømrer pr. time</Link></li>
        <li key="l1"><Link to="/blog/hvad-koster-elektriker-pr-time-2026">Pris på elektriker pr. time</Link></li>
        <li key="l2"><Link to="/toemrer">Find tømrer eller snedker</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
