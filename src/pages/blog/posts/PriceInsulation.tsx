import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "isolering-pris-pr-m2-2026",
  keywords: "isolering pris pr m2 2026, hulmurs isolering pris, loft isolering",
  faq: [
    { q: "Hvad koster isolering pr. m²?", a: "Loft: 185–325 kr./m². Hulmur (indblæsning): 145–245 kr./m². Indvendig vægisolering: 695–1.295 kr./m²." },
    { q: "Kan jeg få tilskud?", a: "Ja — Energistyrelsens energirenovering: tilskud 25–45% af materialeudgift til loft og hulmur." },
    { q: "Hvor meget kan jeg spare på varmeregningen?", a: "20–40% ved efterisolering af loft + hulmur i et 1970'er-hus." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — 25% retur på arbejdsløn op til 12.900 kr./person/år." },
  ],
  sections: [
    { heading: "Pris pr. type", list: ["Loft (300 mm mineraluld): 185–325 kr./m².","Hulmur indblæsning: 145–245 kr./m².","Indvendig facade (gips + isolering): 695–1.295 kr./m².","Udvendig facadeisolering: 1.250–2.495 kr./m².","Krybekælder: 295–595 kr./m²."] },
    { heading: "Spar penge", list: ["Søg energirenoveringstilskud.","Saml flere energitiltag i én ansøgning.","Brug BoligJob på arbejdsløn.","Indhent 3 tilbud — typisk 35% spredning."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/tagdaekker-pris-nyt-tag-2026">Hvad koster nyt tag?</Link></li>
        <li key="l1"><Link to="/blog/nye-vinduer-pris-pr-stk-2026">Pris på nye vinduer</Link></li>
        <li key="l2"><Link to="/haandvaerker">Find håndværker til isolering</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
