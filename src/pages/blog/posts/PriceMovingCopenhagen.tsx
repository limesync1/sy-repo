import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "flyttefirma-koebenhavn-pris",
  keywords: "flyttefirma København pris, flytning København, flyttefirma billig københavn",
  faq: [
    { q: "Hvad koster flyttefirma i København for 2-værelses?", a: "3.500–6.500 kr. inkl. moms — afhængigt af afstand, etage og bro/elevator. Pakning lægger 1.500–3.500 kr. på." },
    { q: "Hvad koster det for 3-værelses i KBH?", a: "5.500–10.500 kr. for selve flytningen. Med pakning og montering 8.000–15.500 kr." },
    { q: "Hvad koster villa-flytning?", a: "9.000–22.000 kr. afhængigt af volumen, afstand og om der er klaver/flygel." },
    { q: "Hvad koster trappetillæg?", a: "5.–6. etage uden elevator: typisk 1.500–4.000 kr. ekstra. Smal trappe/møbelhejs: 3.500–8.500 kr." },
  ],
  sections: [
    { heading: "Konkrete priser efter boligstørrelse (København)", list: ["1-vær. (under 40 m²): 2.500–4.500 kr.","2-vær. (40–65 m²): 3.500–6.500 kr.","3-vær. (65–95 m²): 5.500–10.500 kr.","4-vær. (95–125 m²): 8.500–15.500 kr.","Villa (125+ m²): 12.000–22.000 kr."] },
    { heading: "Tillæg du skal være opmærksom på", list: ["Trappetillæg fra 5. etage: 1.500–4.000 kr.","Parkeringsdispensation i indre by: 350–895 kr.","Klaver/flygel: 1.500–4.500 kr.","Pakning af køkken: 2.500–5.500 kr.","Bortskaffelse af affald: 950–2.500 kr."] },
    { heading: "Sådan halverer du prisen", list: ["Pak selv — sparer 25–40%.","Flyt uden for månedsskifte (1. og 30.) — 15–20% rabat.","Bestil 4–6 uger i forvejen.","Indhent 3 tilbud (typisk 35% spredning).","Brug BoligJob-fradraget på op- og nedpakning."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/selv-flytte-vs-flyttefirma">Selv-flytning vs. flyttefirma</Link></li>
        <li key="l1"><Link to="/blog/tjekliste-til-flyttedag">Tjekliste til flyttedag</Link></li>
        <li key="l2"><Link to="/flyttehjaelp/koebenhavn">Find flyttefirma i København</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
