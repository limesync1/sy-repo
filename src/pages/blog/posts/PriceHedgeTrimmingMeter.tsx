import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "haekkeklipning-pris-pr-meter-2026",
  keywords: "hækkeklipning pris pr meter 2026, klipning af hæk pris, liguster pris klipning",
  faq: [
    { q: "Hvad koster hækkeklipning pr. løbende meter?", a: "85–195 kr./lbm. inkl. moms afhængigt af højde og bortskaffelse." },
    { q: "Hvor ofte skal hækken klippes?", a: "Liguster 2× årligt (juni + august). Thuja 1× årligt. Bøg 1× årligt (juli)." },
    { q: "Indgår bortkørsel?", a: "Som regel ja på meter-pris — bekræft det. Stor afklipsmængde kan koste 500–2.500 kr. ekstra i container." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — 25% retur på arbejdsløn." },
  ],
  sections: [
    { heading: "Pris pr. lbm. efter højde", list: ["Op til 1 m: 85–125 kr./lbm.","1–2 m: 110–155 kr./lbm.","2–3 m: 145–195 kr./lbm.","Over 3 m (kræver lift/stige): 195–285 kr./lbm."] },
    { heading: "Pris efter hæktype", list: ["Liguster: standardpris.","Thuja: +10–25%.","Bøg (tæt løv): +15–25%.","Taks: +20–35% (svær at klippe pænt)."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/hvad-koster-haveservice-pr-time-2026">Pris på haveservice pr. time</Link></li>
        <li key="l1"><Link to="/blog/havemand-pris-koebenhavn-2026">Hvad koster en havemand i København?</Link></li>
        <li key="l2"><Link to="/haveservice">Find haveservice</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
