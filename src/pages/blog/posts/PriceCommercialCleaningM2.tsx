import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "erhvervsrengoering-pris-pr-m2",
  keywords: "erhvervsrengøring pris pr m2, kontorrengøring pris, butiksrengøring pris",
  faq: [
    { q: "Hvad koster erhvervsrengøring pr. m²?", a: "Kontor 4–9 kr./m², butik 5–11 kr./m², lager 2,5–5 kr./m² pr. besøg afhængigt af frekvens." },
    { q: "Er der minimumstid?", a: "Ja — typisk 1,5–2 timer pr. besøg eller minimum 350–550 kr." },
    { q: "Hvor ofte skal kontoret rengøres?", a: "Hver 14. dag for små kontorer, 2–5× ugentligt for større arbejdspladser." },
    { q: "Er moms fradragsberettiget?", a: "Ja — virksomheder fratrækker 25% moms fuldt og kan typisk udgiftsføre arbejdsløn 100%." },
  ],
  sections: [
    { heading: "Priser pr. branche (pr. m² pr. besøg)", list: ["Kontor under 200 m²: 6–9 kr.","Kontor 200–800 m²: 4,5–7 kr.","Butik/retail: 5–11 kr.","Lager: 2,5–5 kr.","Klinik/lægehus: 8–14 kr.","Restaurant (køkken): 12–22 kr."] },
    { heading: "Sådan får du bedre pris", list: ["Forpligt dig på 12 mdr. = 8–15% rabat.","Saml flere lokationer = volumenrabat.","Få fast m²-pris, ikke timepris.","Definér kvalitetsniveau (frekvens af specifikke opgaver)."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/privatrengoering-pris-pr-time">Privatrengøring pris pr. time</Link></li>
        <li key="l1"><Link to="/blog/saadan-vaelger-du-rengoeringsfirma">Vælg det rigtige rengøringsfirma</Link></li>
        <li key="l2"><Link to="/erhvervsrengoering">Find erhvervsrengøring</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
