import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "maler-koebenhavn-pris-2026",
  keywords: "maler København pris 2026, malerpris kbh, malermester pris",
  faq: [
    { q: "Hvad koster en maler i København pr. time?", a: "525–745 kr./time inkl. moms. Mester typisk 645–745 kr., svend 525–625 kr." },
    { q: "Hvad koster en 80 m² lejlighed malet?", a: "Vægge + loft 2 lag: 22.000–38.500 kr. Med lister, døre og karme: 32.000–55.000 kr." },
    { q: "Er København dyrere end provinsen?", a: "Ja — 15–25% dyrere end resten af landet pga. høj efterspørgsel og høje driftsomkostninger." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — al indvendig maling giver 25% retur på arbejdsløn op til 12.900 kr./person/år." },
  ],
  sections: [
    { heading: "Pris pr. m² i København", list: ["Vægge: 105–155 kr./m².","Loft: 125–175 kr./m².","Lister: 75–115 kr./lbm.","Døre: 950–1.450 kr./stk."] },
    { heading: "Pris pr. bydel", list: ["Indre By + Frederiksberg: 645–745 kr./time.","Vesterbro/Nørrebro/Østerbro: 595–695 kr./time.","Hellerup + Charlottenlund: 645–745 kr./time.","Vestegnen: 525–625 kr./time."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/hvad-koster-male-stue-2026">Hvad koster det at male en stue?</Link></li>
        <li key="l1"><Link to="/blog/saadan-vaelger-du-maler">Sådan vælger du den rette maler</Link></li>
        <li key="l2"><Link to="/maler/koebenhavn">Find maler i København</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
