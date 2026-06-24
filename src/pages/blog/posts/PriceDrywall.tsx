import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "gipsvaeg-opsaetning-pris-pr-m2-2026",
  keywords: "gipsvæg pris pr m2 2026, gipsplade væg pris, indvendig væg pris",
  faq: [
    { q: "Hvad koster opsætning af gipsvæg pr. m²?", a: "395–695 kr./m² inkl. stålprofiler, isolering og enkeltlags gips." },
    { q: "Skal isolering med?", a: "Ofte ja — lyd-isolering 35–95 kr./m² ekstra. Lyddæmpning mellem værelser kan fordoble pris." },
    { q: "Hvor lang tid tager det?", a: "20 m² ny væg: 1–2 dage for tømrer + 1 dag spartling + maler bagefter." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — 25% retur på arbejdsløn." },
  ],
  sections: [
    { heading: "Pris pr. m² inkl. arbejde", list: ["Enkeltsidet gips på eksisterende væg: 195–395 kr./m².","Standard skillevæg (begge sider gips + isolering): 395–695 kr./m².","Lyddæmpet skillevæg: 595–895 kr./m².","Vådrumsgips i badeværelse: 595–995 kr./m²."] },
    { heading: "Tillæg", list: ["Maler efter: 95–155 kr./m².","Dør i ny væg: 4.500–9.500 kr.","El-stik/føringer: 695–1.495 kr./stk.","Spartling 3 lag for malerklar: 145–245 kr./m²."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/fjern-huller-i-vaeg-selv">Fjern huller i væg selv</Link></li>
        <li key="l1"><Link to="/blog/hvad-koster-male-stue-2026">Pris på maler</Link></li>
        <li key="l2"><Link to="/haandvaerker">Find håndværker</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
