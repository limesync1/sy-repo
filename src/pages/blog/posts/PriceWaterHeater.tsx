import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "varmtvandsbeholder-skift-pris-2026",
  keywords: "varmtvandsbeholder skift pris 2026, ny vandvarmer pris",
  faq: [
    { q: "Hvad koster en ny varmtvandsbeholder installeret?", a: "8.500–22.500 kr. inkl. arbejde og standard 110-160 L beholder." },
    { q: "Hvor længe holder en varmtvandsbeholder?", a: "8–15 år. Tegn på den skal skiftes: rust, lugt, faldende varmtvandstryk." },
    { q: "Skal el-tilslutning også med?", a: "Ja — typisk inkluderet ved standardudskift. Hvis ny gruppe i tavle: +2.500–5.500 kr." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — arbejdsløn er fradragsberettiget." },
  ],
  sections: [
    { heading: "Pris efter størrelse", list: ["80 L (lille bolig): 8.500–13.500 kr.","110-160 L (standard): 11.500–18.500 kr.","200 L (stor familie): 14.500–22.500 kr.","300+ L (erhverv/villa): 22.500–38.500 kr."] },
    { heading: "Tillæg", list: ["Ny gruppe i tavle: 2.500–5.500 kr.","Demontering gammel: 695–1.495 kr.","Nyt rør/kobling: 1.500–3.500 kr.","Akutudkald: +35–50% tillæg."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/vvs-akut-foer-installatoeren-kommer">VVS-akut før installatøren kommer</Link></li>
        <li key="l1"><Link to="/blog/vvs-vandhane-skift-pris-2026">Pris på vandhane-skift</Link></li>
        <li key="l2"><Link to="/vvs">Find VVS</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
