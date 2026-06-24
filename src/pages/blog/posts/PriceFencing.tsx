import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "hegn-opsaetning-pris-pr-meter-2026",
  keywords: "hegn opsætning pris pr meter 2026, plankeværk pris, raftehegn pris",
  faq: [
    { q: "Hvad koster nyt hegn pr. løbende meter?", a: "Plankeværk: 595–1.150 kr./lbm. Raftehegn: 695–1.495 kr./lbm. Trådhegn: 195–445 kr./lbm." },
    { q: "Skal stolper også i prisen?", a: "Som regel ja — bekræft det. Betonfundament: typisk +195 kr./stolpe." },
    { q: "Hvor højt må hegnet være?", a: "Naboretsligt: 1,8 m langs skel uden samtykke. Højere kræver naboaftale eller dispensation." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — 25% retur på arbejdsløn." },
  ],
  sections: [
    { heading: "Pris pr. lbm. komplet", list: ["Plankeværk trykimp.: 595–895 kr.","Plankeværk lærk: 795–1.150 kr.","Raftehegn: 695–1.495 kr.","Pilegreflet hegn: 495–895 kr.","Trådhegn med stolper: 195–445 kr.","Smedejernshegn: 1.495–2.995 kr."] },
    { heading: "Tillæg", list: ["Betonfundamentering pr. stolpe: 195–395 kr.","Låge enkelt: 1.995–4.500 kr.","Dobbeltlåge: 4.500–9.500 kr.","Hækplantning som alternativ: 145–295 kr./lbm."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/toemrer-timepris-2026">Pris på tømrer</Link></li>
        <li key="l1"><Link to="/blog/haekkeklipning-pris-pr-meter-2026">Pris på hækkeklipning</Link></li>
        <li key="l2"><Link to="/toemrer">Find tømrer</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
