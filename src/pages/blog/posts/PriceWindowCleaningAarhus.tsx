import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "vinduespudsning-aarhus-pris-2026",
  keywords: "vinduespudsning Aarhus pris, vinduespudser aarhus",
  faq: [
    { q: "Hvad koster vinduespudsning i Aarhus?", a: "Villa: 295–895 kr. pr. gang. Lejlighed: 195–495 kr. pr. gang." },
    { q: "Pris pr. vindue?", a: "22–45 kr./fag inkl. moms. Sprosser tillægges 8–18 kr./vindue." },
    { q: "Abonnementsrabat?", a: "Ja — fast hver 6.–8. uge giver 15–25% rabat." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — udvendig vinduespudsning på helårsbolig giver 25% retur." },
  ],
  sections: [
    { heading: "Pris pr. størrelse i Aarhus", list: ["Lille villa (10–14 vinduer): 295–495 kr.","Middel villa (15–22): 445–795 kr.","Stor villa (23–35): 695–1.125 kr.","Lejlighed 2 vær.: 195–325 kr.","Lejlighed 3-4 vær.: 295–495 kr."] },
    { heading: "Spar 20–30%", list: ["Tegn abonnement.","Saml naboer.","Vælg vinter-måneder.","Få fast pris pr. gang."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/vinduespudsning-villa-pris">Vinduespudsning villa pris</Link></li>
        <li key="l1"><Link to="/blog/vinduespudsning-erhverv-pris-2026">Vinduespudsning erhverv pris</Link></li>
        <li key="l2"><Link to="/vinduespudsning/aarhus">Find vinduespudser i Aarhus</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
