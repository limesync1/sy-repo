import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "hovedrengoering-pris-pr-m2-2026",
  keywords: "hovedrengøring pris pr m2 2026, dybderens pris, fraflytningsrengøring",
  faq: [
    { q: "Hvad koster hovedrengøring pr. m²?", a: "85–145 kr./m² inkl. moms. Med ovn, køleskab og vinduer: 110–175 kr./m²." },
    { q: "Hvor lang tid tager det?", a: "90 m² bolig: 5–8 timer for et hold på 2." },
    { q: "Indgår rengøringsmidler?", a: "Som regel ja — bekræft i tilbuddet." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — 25% retur på arbejdsløn." },
  ],
  sections: [
    { heading: "Pris pr. boligstørrelse", list: ["50 m² lejlighed: 4.250–7.500 kr.","75 m² lejlighed: 6.500–11.000 kr.","100 m² hus: 8.500–14.500 kr.","150 m² villa: 12.500–22.000 kr.","200 m² villa: 17.000–29.500 kr."] },
    { heading: "Spar penge", list: ["Saml hovedrengøring + vinduespudsning: 10–15% rabat.","Lav grovrydning selv inden firma kommer.","Få fast pris i stedet for timepris.","Brug BoligJob-fradraget."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/tjekliste-hovedrengoering-foraar">Tjekliste hovedrengøring forår</Link></li>
        <li key="l1"><Link to="/blog/hvad-koster-flytterengoering-2026">Hvad koster flytterengøring?</Link></li>
        <li key="l2"><Link to="/rengoering">Find rengøring i din by</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
