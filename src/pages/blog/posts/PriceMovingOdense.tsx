import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "flyttefirma-odense-pris-2026",
  keywords: "flyttefirma Odense pris 2026, flytning fyn pris",
  faq: [
    { q: "Hvad koster flyttefirma i Odense?", a: "2-vær. 2.800–4.800 kr., 3-vær. 4.500–8.500 kr., villa 7.500–16.500 kr." },
    { q: "Er Fyn billigere end Sjælland?", a: "Ja — typisk 20–30% billigere end København for tilsvarende boligstørrelse." },
    { q: "Hvornår skal jeg booke?", a: "3–4 uger før — månedsskifte er ofte udsolgt 6 uger frem." },
    { q: "Hvilke områder dækker?", a: "Hele Odense + Munkebo, Otterup, Nyborg, Middelfart, Svendborg." },
  ],
  sections: [
    { heading: "Pris pr. boligstørrelse", list: ["1-vær.: 1.995–3.500 kr.","2-vær.: 2.800–4.800 kr.","3-vær.: 4.500–8.500 kr.","4-vær.: 6.500–12.500 kr.","Villa 125+ m²: 9.500–18.500 kr."] },
    { heading: "Tillæg", list: ["Trappetillæg fra 4. etage: 750–2.500 kr.","Pakning af køkken: 1.800–3.800 kr.","Klaver: 1.200–3.500 kr.","Bortskaffelse: 850–2.200 kr."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/flyttefirma-koebenhavn-pris">Flyttefirma København pris</Link></li>
        <li key="l1"><Link to="/blog/flyttefirma-aarhus-pris">Flyttefirma Aarhus pris</Link></li>
        <li key="l2"><Link to="/flyttehjaelp/odense">Find flyttefirma i Odense</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
