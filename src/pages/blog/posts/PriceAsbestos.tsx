import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "asbestsanering-pris-2026",
  keywords: "asbestsanering pris 2026, asbest fjernelse, eternit asbest",
  faq: [
    { q: "Hvad koster asbestsanering?", a: "250–595 kr./m² inkl. moms — kraftigt afhængigt af mængde og adgang." },
    { q: "Er det lovpligtigt?", a: "Ja — al asbestnedrivning skal udføres af certificeret firma og anmeldes til Arbejdstilsynet senest 14 dage før." },
    { q: "Hvor finder jeg asbest?", a: "Eternittag (før 1986), gulvbelægning, isolering omkring rør, lofter med pap-plader (1950-1980)." },
    { q: "Er det BoligJob-berettiget?", a: "Nej — sanering er typisk ikke fradragsberettiget. Konsulter altid revisor." },
  ],
  sections: [
    { heading: "Pris pr. type asbest", list: ["Eternittag 150 m²: 65.000–125.000 kr.","Asbestholdig gulvbelægning 50 m²: 25.000–55.000 kr.","Rørisolering pr. lbm.: 595–1.495 kr.","Loftsplader 30 m²: 18.500–42.500 kr."] },
    { heading: "Du må ALDRIG selv", list: ["Skære eller bore i asbestholdige materialer.","Bortskaffe i almindelig affald.","Højtryksrense asbesttag.","Renovere uden certificeret rådgiver."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/tagdaekker-pris-nyt-tag-2026">Hvad koster et nyt tag?</Link></li>
        <li key="l1"><Link to="/blog/utaet-tag-akut-hvad-gor-du">Utæt tag akut</Link></li>
        <li key="l2"><Link to="/haandvaerker">Find autoriseret håndværker</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
