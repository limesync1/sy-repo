import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "kloakmester-pris-2026",
  keywords: "kloakmester pris 2026, kloakrensning pris, autoriseret kloakmester",
  faq: [
    { q: "Hvad koster en kloakmester pr. time?", a: "595–895 kr./time inkl. moms. Autoriseret kloakmester typisk i toppen." },
    { q: "Hvad koster kloakspuling?", a: "1.895–3.995 kr. for almindelig spuling af parcelhus." },
    { q: "Hvad koster TV-inspektion af kloak?", a: "2.495–4.995 kr. inkl. rapport. Kræves ofte ved hushandel." },
    { q: "Er det BoligJob-berettiget?", a: "Reparation og vedligehold ja — udskiftning af hele kloakanlæg som regel ikke." },
  ],
  sections: [
    { heading: "Faste priser på typisk arbejde", list: ["Kloakspuling: 1.895–3.995 kr.","TV-inspektion: 2.495–4.995 kr.","Rottespærre montering: 4.500–9.500 kr.","Nyt afløbsrør (5 m): 12.500–28.500 kr.","Total kloakrenovering parcelhus: 95.000–250.000 kr."] },
    { heading: "Når du SKAL ringe akut", list: ["Vand siver op af afløb.","Lugt af kloak inde i huset.","Synligt sammenfald af terræn over kloak.","Vand i kælderen efter regn."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/tilstoppet-afloeb-selv-eller-vvs">Tilstoppet afløb — selv eller VVS</Link></li>
        <li key="l1"><Link to="/blog/vvs-akut-foer-installatoeren-kommer">VVS-akut før installatøren kommer</Link></li>
        <li key="l2"><Link to="/vvs">Find VVS/kloakmester</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
