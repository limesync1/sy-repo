import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "snerydning-pris-abonnement-2026",
  keywords: "snerydning pris 2026, snerydning abonnement, vintervedligehold",
  faq: [
    { q: "Hvad koster snerydning?", a: "Engangsudkald: 595–1.495 kr. Sæsonabonnement: 2.495–6.500 kr." },
    { q: "Skal jeg have det?", a: "Som grundejer har du pligt til at rydde fortov inden kl. 7 (kl. 8 weekend) i hele vintermånederne." },
    { q: "Hvad inkluderer abonnement?", a: "Typisk: snerydning + saltning ved frost. Antal udkald pr. sæson varierer fra 8–30." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — 25% retur på arbejdsløn." },
  ],
  sections: [
    { heading: "Pris-bod abonnement (1 sæson)", list: ["Standard parcelhus fortov + indkørsel: 2.495–4.500 kr.","Stor matrikel + parkeringsareal: 4.500–9.500 kr.","Erhverv små lokationer: 6.500–15.000 kr.","Erhverv store p-pladser: 15.000–45.000 kr."] },
    { heading: "Engangsudkald-priser", list: ["Almindelig snerydning + saltning: 595–995 kr.","Stor matrikel: 995–1.995 kr.","Akut nattevejr: 1.495–2.795 kr."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/klargoer-haven-til-vinter">Klargør haven til vinter</Link></li>
        <li key="l1"><Link to="/blog/hvad-koster-haveservice-pr-time-2026">Haveservice pris pr. time</Link></li>
        <li key="l2"><Link to="/haveservice">Find haveservice</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
