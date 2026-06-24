import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "vinduespudsning-erhverv-pris-2026",
  keywords: "erhvervsvinduespudsning pris 2026, butiksvinduer pris, kontor vinduespudser pris",
  faq: [
    { q: "Hvad koster erhvervsvinduespudsning?", a: "Butiksvinduer 11–25 kr./m², kontor 8–18 kr./m², facadehøj glas med lift 35–95 kr./m²." },
    { q: "Hvor ofte skal butiksvinduer pudses?", a: "1–2× ugentligt i fødevarer, 1× hver 14. dag i kontorbutik, 1× månedligt i lavtrafik." },
    { q: "Hvad koster lift?", a: "Bilmonteret lift 4.500–8.500 kr./dag inkl. operatør. Selvkørende lift 2.500–4.500 kr./dag." },
    { q: "Er momsen fradragsberettiget?", a: "Ja — 25% momsfradrag og udgift kan udgiftsføres 100%." },
  ],
  sections: [
    { heading: "Pris pr. m² afhængigt af type", list: ["Butiksvinduer (ned til jord): 11–25 kr.","Kontor i lav etage: 8–18 kr.","Facadehøje glas (op til 6 m): 25–55 kr.","Glasfacader med lift: 35–95 kr.","Klinik/lægehus med hygiejnekrav: 18–35 kr."] },
    { heading: "Sådan får du bedre pris", list: ["Forpligt dig på 12 mdr.: 10–20% rabat.","Saml flere lokationer.","Få fast m²-pris.","Definér frekvens — eks. 'hver torsdag før kl. 8'."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/vinduespudsning-villa-pris">Vinduespudsning villa pris</Link></li>
        <li key="l1"><Link to="/blog/vinduespudser-pris-pr-m2">Vinduespudsning pris pr. m²</Link></li>
        <li key="l2"><Link to="/vinduespudsning">Find erhvervsvinduespudsning</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
