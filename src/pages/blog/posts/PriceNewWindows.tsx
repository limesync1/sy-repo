import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "nye-vinduer-pris-pr-stk-2026",
  keywords: "nye vinduer pris pr stk 2026, vinduesudskift pris, energirude vindue",
  faq: [
    { q: "Hvad koster et nyt vindue installeret?", a: "4.500–14.500 kr./stk. inkl. montering, afhængigt af størrelse, U-værdi og materiale." },
    { q: "Træ eller plast?", a: "Træ-aluminium: 8.500–14.500 kr./stk. Plast: 4.500–8.500 kr./stk. Træ ren: 6.500–11.500 kr." },
    { q: "Hvor lang holdbarhed?", a: "Træ-aluminium: 40–60 år. Plast: 25–40 år. Træ: 30–50 år (afhængigt af vedligehold)." },
    { q: "Tilskud muligt?", a: "Ja — energirenoveringstilskud ved udskift til 3-lagsruder, op til 25% af materialeudgift." },
  ],
  sections: [
    { heading: "Pris pr. vindue installeret (standardstørrelse)", list: ["Plast 2-lags: 4.500–6.500 kr.","Plast 3-lags energi: 6.500–9.500 kr.","Træ 2-lags: 6.500–9.500 kr.","Træ-alu 3-lags energi: 9.500–14.500 kr.","Special tagvindue (VELUX): 8.500–18.500 kr."] },
    { heading: "Tillæg", list: ["Demontering gammelt vindue: 695–1.295 kr./stk.","Mursarbejde efter: 1.500–3.500 kr./stk.","Indvendig efter-arbejde (lister, maler): 950–2.495 kr./stk.","Stillads: 12.000–28.000 kr."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/glarmester-pris-vindue-2026">Pris på glarmester</Link></li>
        <li key="l1"><Link to="/blog/isolering-pris-pr-m2-2026">Pris på isolering</Link></li>
        <li key="l2"><Link to="/toemrer">Find tømrer eller glarmester</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
