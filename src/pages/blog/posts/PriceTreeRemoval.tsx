import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "traefaeldning-pris-2026",
  keywords: "træfældning pris 2026, fælde træ pris, stubfræsning pris",
  faq: [
    { q: "Hvad koster træfældning?", a: "Mindre træ (under 8 m): 1.500–3.500 kr. Stort træ med beskæring: 6.500–18.000 kr. Kran-fældning: 12.000–35.000 kr." },
    { q: "Skal jeg søge tilladelse?", a: "Bevaringsværdige træer kræver tilladelse fra kommunen. Tjek kommuneplan og lokalplan først." },
    { q: "Hvad koster stubfræsning?", a: "Lille stub: 695–1.495 kr. Stor stub (over 50 cm): 1.995–4.500 kr." },
    { q: "Indgår bortkørsel?", a: "Ofte ja — bekræft før booking. Flis kan ofte beholdes gratis i haven." },
  ],
  sections: [
    { heading: "Priser efter trætype og størrelse", list: ["Lille træ (under 8 m): 1.500–3.500 kr.","Mellem (8–15 m): 4.500–9.500 kr.","Stort (15–25 m): 8.500–18.500 kr.","Meget stort + tæt på hus (kran): 15.000–35.000 kr.","Stubfræsning: 695–4.500 kr."] },
    { heading: "Tillæg du skal regne med", list: ["Bortkørsel af stamme/grene: 950–3.500 kr.","Lift hvis ingen plads: 4.500–8.500 kr.","Specialarbejde (klatrearborist): +3.500–9.500 kr."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/klargoer-haven-til-vinter">Klargør haven til vinter</Link></li>
        <li key="l1"><Link to="/blog/haekkeklipning-pris-pr-meter-2026">Pris på hækkeklipning</Link></li>
        <li key="l2"><Link to="/haveservice">Find arborist eller havemand</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
