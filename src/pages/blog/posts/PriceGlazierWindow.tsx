import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "glarmester-pris-vindue-2026",
  keywords: "glarmester pris vindue 2026, ny vinduesrude pris, termorude pris",
  faq: [
    { q: "Hvad koster en ny vinduesrude?", a: "Termorude 3.500–9.500 kr. inkl. montering. 3-lagsrude 5.500–14.500 kr." },
    { q: "Dækker forsikringen?", a: "Indboforsikring dækker ofte ved indbrud, hagl eller pludselig skade. Selvskade kræver ofte glasforsikring som tillæg." },
    { q: "Hvor hurtigt kan jeg få ny rude?", a: "Standard-størrelse: 1–5 hverdage. Special-størrelse: 2–4 uger." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — udskiftning af vinduesrude på helårsbolig giver 25% retur på arbejdsløn." },
  ],
  sections: [
    { heading: "Pris efter rudetype", list: ["2-lags termorude standard (op til 1,5 m²): 3.500–6.500 kr.","2-lags stor (over 1,5 m²): 5.500–9.500 kr.","3-lags energirude: 5.500–14.500 kr.","Lydrude: +1.500–3.500 kr.","Sikkerhedslamineret: +1.500–4.500 kr."] },
    { heading: "Akut-priser ved indbrud", list: ["Midlertidig tildækning: 950–2.495 kr.","Skift af glas inden 24 t: +35–60% tillæg.","Sikring af karm: 1.500–4.500 kr."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/hvad-koster-elektriker-pr-time-2026">Pris på elektriker pr. time</Link></li>
        <li key="l1"><Link to="/glarmester">Find glarmester</Link></li>
        <li key="l2"><Link to="/tilbud">Få 3 tilbud</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
