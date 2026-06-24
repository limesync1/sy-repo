import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "vinduespudsning-villa-pris",
  keywords: "vinduespudsning villa pris, vinduespudser pris pr gang, abonnement vinduespudsning",
  faq: [
    { q: "Hvad koster vinduespudsning til en villa?", a: "350–1.200 kr. pr. gang. En typisk parcelhusvilla med 15–25 vinduer ligger 495–895 kr. ved abonnement hver 6.–8. uge." },
    { q: "Hvad er prisen pr. vindue?", a: "25–55 kr. pr. fag inkl. moms. Karme og sprosser koster typisk 10–25 kr. ekstra pr. vindue." },
    { q: "Hvor ofte skal villavinduer pudses?", a: "4–8 gange årligt. Hvert 6.–8. uge er det normale interval — oftere ved kystnære boliger eller bygefuldt vejr." },
    { q: "Er vinduespudsning BoligJob-berettiget?", a: "Ja — udvendig vinduespudsning på helårsbolig giver 25% retur på arbejdsløn op til 12.900 kr. pr. person i 2026." },
  ],
  sections: [
    { heading: "Pris pr. gang efter villastørrelse", list: ["Lille villa (10–14 vinduer): 350–550 kr.","Middel villa (15–22 vinduer): 495–895 kr.","Stor villa (23–35 vinduer): 795–1.250 kr.","Tilbygning/atelier: +150–350 kr.","Karme + lister: +20–40% af pris"] },
    { heading: "Sådan presser du prisen 20–30%", list: ["Tegn abonnement — typisk 15–25% rabat.","Saml flere naboer på samme dag.","Vælg vinter-måneder uden for højsæson.","Få fast pris pr. gang, ikke timepris.","Pud selv vinduer inde — kun ude udført af firma."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/vinduespudsning-erhverv-pris-2026">Hvad koster erhvervsvinduespudsning?</Link></li>
        <li key="l1"><Link to="/blog/vinduespudser-pris-pr-m2">Vinduespudsning pris pr. m²</Link></li>
        <li key="l2"><Link to="/vinduespudsning">Find vinduespudser i din by</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
