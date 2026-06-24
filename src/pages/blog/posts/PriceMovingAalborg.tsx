import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "flyttefirma-aalborg-pris-2026",
  keywords: "flyttefirma Aalborg pris 2026, flytning nordjylland",
  faq: [
    { q: "Hvad koster flyttefirma i Aalborg?", a: "2-vær. 2.500–4.500 kr., 3-vær. 4.200–8.000 kr., villa 7.000–15.500 kr." },
    { q: "Er Nordjylland billigere?", a: "Ja — 20–30% billigere end København. Aalborg ligger på niveau med Odense." },
    { q: "Dækker firmaerne hele regionen?", a: "Ja — Aalborg, Nørresundby, Hjørring, Frederikshavn, Brønderslev og Skagen." },
    { q: "Er pakning inkluderet?", a: "Nej — typisk tillæg på 1.500–3.500 kr. for køkken/hele bolig." },
  ],
  sections: [
    { heading: "Pris pr. boligstørrelse", list: ["1-vær.: 1.795–3.200 kr.","2-vær.: 2.500–4.500 kr.","3-vær.: 4.200–8.000 kr.","4-vær.: 6.000–11.500 kr.","Villa: 9.000–17.500 kr."] },
    { heading: "Spar penge", list: ["Flyt midt på måneden.","Pak selv.","Indhent 3 tilbud.","BoligJob på pakning og evt. flytterengøring."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/flyttefirma-koebenhavn-pris">Flyttefirma København pris</Link></li>
        <li key="l1"><Link to="/blog/tjekliste-til-flyttedag">Tjekliste til flyttedag</Link></li>
        <li key="l2"><Link to="/flyttehjaelp/aalborg">Find flyttefirma i Aalborg</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
