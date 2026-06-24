import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "maler-aarhus-pris-2026",
  keywords: "maler Aarhus pris 2026, maler pris kvm aarhus",
  faq: [
    { q: "Hvad koster en maler i Aarhus pr. time?", a: "495–695 kr./time inkl. moms — ca. 10–15% billigere end København." },
    { q: "Hvad koster 80 m² malet?", a: "18.500–32.500 kr. for vægge + loft 2 lag." },
    { q: "Hvad koster facademaling i Aarhus?", a: "145–245 kr./m² inkl. moms. Stillads tillægges 12.000–28.000 kr." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — 25% retur på arbejdsløn." },
  ],
  sections: [
    { heading: "Pris pr. m² i Aarhus", list: ["Vægge: 95–145 kr./m².","Loft: 115–165 kr./m².","Facade: 145–245 kr./m².","Lister: 65–105 kr./lbm."] },
    { heading: "Pris pr. bydel", list: ["Aarhus C: 595–695 kr./time.","Risskov + Skåde: 545–645 kr./time.","Højbjerg + Holme: 525–595 kr./time.","Brabrand + Tilst: 495–575 kr./time."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/hvad-koster-male-stue-2026">Hvad koster det at male en stue?</Link></li>
        <li key="l1"><Link to="/blog/forberedelse-foer-maleren-kommer">Forberedelse før maleren kommer</Link></li>
        <li key="l2"><Link to="/maler/aarhus">Find maler i Aarhus</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
