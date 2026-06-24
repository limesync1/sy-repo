import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "kontorrengoering-koebenhavn-pris-2026",
  keywords: "kontorrengøring København pris, erhvervsrengøring kbh pris",
  faq: [
    { q: "Hvad koster kontorrengøring i København?", a: "8–18 kr./m² pr. besøg ved fast abonnement." },
    { q: "Hvor ofte skal kontoret rengøres?", a: "2–5× ugentligt for almindeligt kontor med 10+ medarbejdere." },
    { q: "Er der mindstepris?", a: "Ja — typisk 695–895 kr. pr. besøg eller minimum 1,5 t arbejde." },
    { q: "Er momsen fradragsberettiget?", a: "Ja — fuldt momsfradrag og udgiften kan fratrækkes 100%." },
  ],
  sections: [
    { heading: "Pris pr. m² i KBH", list: ["Mindre kontor under 200 m²: 11–18 kr./m²/besøg.","Mellem 200–800 m²: 8–13 kr./m²/besøg.","Stor over 800 m²: 6–10 kr./m²/besøg.","Klinik/lægehus: 14–22 kr./m²/besøg."] },
    { heading: "Tillæg", list: ["Vinduespudsning hver 14. dag: 4–8 kr./m².","Specialrengøring efter event: 35–75 kr./m².","Køkken/spiseområde dybderens: 15–25 kr./m²."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/erhvervsrengoering-pris-pr-m2">Erhvervsrengøring pris pr. m²</Link></li>
        <li key="l1"><Link to="/blog/rengoering-koebenhavn-pris-2026">Rengøring København pris</Link></li>
        <li key="l2"><Link to="/erhvervsrengoering">Find erhvervsrengøring i KBH</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
