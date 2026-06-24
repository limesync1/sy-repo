import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "flyttefirma-aarhus-pris",
  keywords: "flyttefirma Aarhus pris, flytning Aarhus, flyttefirma billig aarhus",
  faq: [
    { q: "Hvad koster flyttefirma i Aarhus?", a: "2-vær. 3.000–5.500 kr., 3-vær. 4.800–8.500 kr., villa 8.000–18.000 kr. Lidt billigere end København." },
    { q: "Hvor meget koster trappetillæg i Aarhus C?", a: "1.000–3.000 kr. for høje etager uden elevator. Smalle ejendomme i midtbyen kan kræve møbelhejs." },
    { q: "Er Aarhus billigere end København?", a: "Ja — typisk 15–25% billigere end København for samme boligstørrelse." },
    { q: "Hvornår skal jeg booke?", a: "Mindst 3–5 uger før — månedsskifte i Aarhus er udsolgt 6–8 uger i forvejen." },
  ],
  sections: [
    { heading: "Pris efter bydel og bolig", list: ["Aarhus C (2-vær.): 3.500–5.500 kr.","Risskov (3-vær. villa-lejlighed): 5.500–9.500 kr.","Højbjerg (villa): 8.000–16.000 kr.","Brabrand (parcelhus): 7.500–14.500 kr.","Tilst/Lystrup (villa): 7.000–13.000 kr."] },
    { heading: "Typiske tillæg i Aarhus", list: ["Smal middelaldergade i midtbyen: 750–2.500 kr.","Parkering uden P-zone: 200–500 kr.","Klaver: 1.200–3.500 kr.","Pakning af køkken: 2.000–4.500 kr."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/flyttefirma-koebenhavn-pris">Sammenlign med København-priser</Link></li>
        <li key="l1"><Link to="/blog/tjekliste-til-flyttedag">Tjekliste til flyttedag</Link></li>
        <li key="l2"><Link to="/flyttehjaelp/aarhus">Find flyttefirma i Aarhus</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
