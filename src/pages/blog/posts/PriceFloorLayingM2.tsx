import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "gulvlaegning-pris-pr-m2-2026",
  keywords: "gulvlægning pris pr m2 2026, parket pris, laminat pris, vinyl pris",
  faq: [
    { q: "Hvad koster gulvlægning pr. m²?", a: "Laminat 195–345 kr./m², parket 425–895 kr./m², vinyl 245–445 kr./m² inkl. arbejde og underlag." },
    { q: "Hvor meget af prisen er materialer?", a: "60–75% materialer, 25–40% arbejdsløn ved laminat. På parket op til 50/50." },
    { q: "Hvad koster afretning?", a: "Selvnivellerende støbning: 165–285 kr./m². Tørafretning: 95–185 kr./m²." },
    { q: "Skal jeg fjerne gammelt gulv selv?", a: "Det sparer 65–125 kr./m². Inkl. bortkørsel typisk 95–165 kr./m²." },
  ],
  sections: [
    { heading: "Pris pr. m² komplet inkl. moms", list: ["Laminat (klikgulv): 195–345 kr.","Vinyl/LVT: 245–445 kr.","Lamel-parket: 395–695 kr.","Massivt plankegulv: 595–1.250 kr.","Mosaikparket: 695–1.450 kr."] },
    { heading: "Tillæg du skal regne med", list: ["Afretning: 95–285 kr./m².","Fjernelse af gammelt gulv: 95–165 kr./m².","Kantlister: 65–110 kr./lbm.","Flytning af møbler: 1.500–4.000 kr."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/hvor-mange-gange-slibe-traegulv">Hvor mange gange kan trægulv slibes?</Link></li>
        <li key="l1"><Link to="/blog/gulvslibning-pris-pr-m2-2026">Pris på gulvslibning</Link></li>
        <li key="l2"><Link to="/gulvlaegger">Find gulvlægger</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
