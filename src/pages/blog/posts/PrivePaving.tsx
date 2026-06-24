import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "indkoersel-belaegning-pris-pr-m2-2026",
  keywords: "indkørsel belægning pris pr m2 2026, fliser indkørsel pris",
  faq: [
    { q: "Hvad koster en ny indkørsel pr. m²?", a: "Betonsten: 595–1.150 kr./m². Brosten: 1.250–2.495 kr./m². Asfalt: 395–795 kr./m²." },
    { q: "Skal jeg lave afretning og afvanding?", a: "Ja — typisk 195–395 kr./m² for stabilisering og dræn." },
    { q: "Hvor længe holder det?", a: "Betonsten 25–50 år. Brosten 75–150 år. Asfalt 15–25 år." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — 25% retur på arbejdsløn." },
  ],
  sections: [
    { heading: "Pris pr. m² komplet", list: ["Asfalt: 395–795 kr./m².","Betonsten 60×40: 595–1.150 kr./m².","Granit chaussésten: 1.450–2.495 kr./m².","Brosten klassisk: 1.250–2.495 kr./m².","Grus: 195–445 kr./m²."] },
    { heading: "Tillæg", list: ["Afretning + bærelag: 195–395 kr./m².","Kantsten: 395–895 kr./lbm.","Dræn: 595–1.495 kr./lbm.","Bortskaffelse af gammel belægning: 195–495 kr./m²."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/murer-pris-pr-time-2026">Pris på murer</Link></li>
        <li key="l1"><Link to="/blog/terrassebygning-pris-pr-m2-2026">Pris på terrassebygning</Link></li>
        <li key="l2"><Link to="/murer">Find murer eller anlægsgartner</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
