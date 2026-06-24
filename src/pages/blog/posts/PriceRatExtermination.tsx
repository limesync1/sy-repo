import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "rottebekaempelse-pris-2026",
  keywords: "rottebekæmpelse pris 2026, rotter i hjem pris, skadedyrsfirma rotter",
  faq: [
    { q: "Hvad koster rottebekæmpelse?", a: "Akut udkald 1.295–2.495 kr. inkl. moms. Løbende sikringsabonnement 2.495–6.500 kr./år." },
    { q: "Er det gratis via kommunen?", a: "Ja — anmeldelse af rotter er gratis ved kommunens autoriserede skadedyrsfirma. Privat firma er hurtigere og diskret." },
    { q: "Hvor hurtigt skal jeg reagere?", a: "Inden for 1–3 dage. En rotte kan æde 25–30 g/dag og ødelægger gasrør, kabler og isolering." },
    { q: "Skal jeg anmelde?", a: "Ja — det er lovpligtigt at anmelde rotter til kommunen." },
  ],
  sections: [
    { heading: "Sådan får du hjælp hurtigst", list: ["Anmeld til kommunen — gratis besøg inden for 8 dage.","Ring privat firma akut — typisk samme dag.","Tæt huller > 6 mm.","Fjern fuglefoder og affald.","Bestil løbende sikring hvis du har haft rotter før."] },
    { heading: "Pris-bod for private firmaer", list: ["Akut udkald + inspektion: 1.295–2.495 kr.","Følgebesøg: 695–1.395 kr.","Sikringsabonnement: 2.495–6.500 kr./år.","Mekanisk tætning: 695–2.495 kr.","Rotteblokerende kloaksikring: 4.500–12.500 kr."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/rotter-eller-mus">Rotter eller mus — hvordan ser jeg forskel?</Link></li>
        <li key="l1"><Link to="/skadedyr">Find skadedyrsbekæmper</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
