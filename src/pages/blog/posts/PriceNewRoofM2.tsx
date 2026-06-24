import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "tagdaekker-pris-nyt-tag-2026",
  keywords: "nyt tag pris pr m2 2026, tagdækker pris, ny tagsten pris",
  faq: [
    { q: "Hvad koster et nyt tag pr. m²?", a: "Tegl 1.150–1.750 kr., beton 850–1.350 kr., ståltag 700–1.150 kr., tagpap 595–895 kr./m² inkl. arbejde og bortskaffelse." },
    { q: "Hvor lang tid holder et nyt tag?", a: "Tegl 80–120 år. Beton 40–60 år. Ståltag 50–70 år. Tagpap 25–40 år." },
    { q: "Skal stilladset med i prisen?", a: "Næsten altid. Stillads til parcelhus: 12.000–28.000 kr." },
    { q: "Er det BoligJob-berettiget?", a: "Tagrenovering på helårsbolig giver 25% retur på arbejdsløn (ikke materialer)." },
  ],
  sections: [
    { heading: "Pris pr. tagtype (150 m² tag)", list: ["Nyt tegltag: 172.500–262.500 kr.","Beton/cementtagsten: 127.500–202.500 kr.","Ståltag: 105.000–172.500 kr.","Tagpap (fladt tag): 89.250–134.250 kr."] },
    { heading: "Tillæg du skal regne med", list: ["Stillads: 12.000–28.000 kr.","Nye lægter + undertag: 195–325 kr./m².","Nye tagrender: 4.500–9.500 kr.","Bortskaffelse af gammelt tag: 95–175 kr./m²."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/hvad-koster-tagrensning-2026">Pris på tagrensning</Link></li>
        <li key="l1"><Link to="/blog/utaet-tag-akut-hvad-gor-du">Utæt tag — akut førstehjælp</Link></li>
        <li key="l2"><Link to="/tagdaekker">Find tagdækker</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
