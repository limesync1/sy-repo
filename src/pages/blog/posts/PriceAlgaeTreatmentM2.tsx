import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "algebehandling-pris-pr-m2-2026",
  keywords: "algebehandling pris pr m2 2026, alger på tag, alger facade pris",
  faq: [
    { q: "Hvad koster algebehandling pr. m²?", a: "Tag 25–55 kr./m², facade 30–65 kr./m², fliser 20–45 kr./m² inkl. moms." },
    { q: "Hvor lang tid holder behandlingen?", a: "Tag og facade: 3–5 år. Fliser/terrasse: 1–2 år. Effektivt produkt + ren overflade = længst holdbarhed." },
    { q: "Skal jeg højtryksrense først?", a: "Ofte ja — på meget tilgroede flader. Ellers virker biocidet kun delvist." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — udvendigt vedligehold på helårsbolig giver 25% retur på arbejdsløn." },
  ],
  sections: [
    { heading: "Pris pr. flade (typiske parcelhus)", list: ["Tag 150 m²: 3.750–8.250 kr.","Facade 120 m²: 3.600–7.800 kr.","Terrasse 25 m²: 500–1.125 kr.","Indkørsel 40 m² (fliser): 800–1.800 kr."] },
    { heading: "Sådan vælger du rigtigt", list: ["Tjek at firmaet bruger godkendt biocid.","Få 3+ år garanti på effekten.","Bed om før/efter-billeder fra tidligere kunder.","Vælg softwash på sårbare tagsten — ikke højtryk."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/algebehandling-hvor-ofte">Hvor ofte skal algebehandling laves?</Link></li>
        <li key="l1"><Link to="/blog/hvad-koster-tagrensning-2026">Pris på tagrensning</Link></li>
        <li key="l2"><Link to="/algebehandling">Find algebehandling-firma</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
