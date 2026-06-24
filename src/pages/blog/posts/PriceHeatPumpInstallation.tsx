import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "varmepumpe-installation-pris-2026",
  keywords: "varmepumpe installation pris 2026, luft til vand varmepumpe pris",
  faq: [
    { q: "Hvad koster en varmepumpe installeret?", a: "Luft-til-luft: 18.000–35.000 kr. Luft-til-vand: 95.000–175.000 kr. Jordvarme: 145.000–245.000 kr." },
    { q: "Kan jeg få tilskud?", a: "Ja — Energistyrelsens varmepumpetilskud 2026: typisk 15.000–35.000 kr. til luft/vand-skift fra olie eller gas." },
    { q: "Hvor lang tid tager installation?", a: "Luft-til-luft: 1 dag. Luft-til-vand: 2–4 dage. Jordvarme: 5–10 dage inkl. boring." },
    { q: "Er det BoligJob-berettiget?", a: "Arbejdsløn på installation er fradragsberettiget op til 12.900 kr./person/år." },
  ],
  sections: [
    { heading: "Pris pr. type komplet", list: ["Luft-til-luft (1 split): 18.000–35.000 kr.","Luft-til-luft (multisplit 3 enheder): 35.000–55.000 kr.","Luft-til-vand 8 kW: 95.000–145.000 kr.","Luft-til-vand 12-16 kW: 125.000–175.000 kr.","Jordvarme 10 kW: 145.000–245.000 kr."] },
    { heading: "Spar penge", list: ["Søg varmepumpetilskuddet (op til 35.000 kr.).","Vælg samlet pakke fra én leverandør.","Få tre tilbud — spredning op til 50%.","Brug BoligJob på arbejdsløn."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/hvad-koster-elektriker-pr-time-2026">Hvad koster elektriker pr. time?</Link></li>
        <li key="l1"><Link to="/blog/tagdaekker-pris-nyt-tag-2026">Pris på nyt tag</Link></li>
        <li key="l2"><Link to="/vvs">Find VVS i din by</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
