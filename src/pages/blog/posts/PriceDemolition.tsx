import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "nedrivning-pris-pr-m2-2026",
  keywords: "nedrivning pris pr m2 2026, nedrivning kvm pris, intern nedrivning bolig",
  faq: [
    { q: "Hvad koster nedrivning pr. m²?", a: "Indvendig delvis: 195–495 kr./m². Totalnedrivning bolig: 395–895 kr./m². Industri: 595–1.495 kr./m²." },
    { q: "Skal jeg betale ekstra for bortkørsel?", a: "Som regel inkluderet i m²-prisen — bekræft. Asbest/blymaling kræver specialhåndtering med betydelige tillæg." },
    { q: "Skal jeg søge tilladelse?", a: "Ja — bærende vægge, totalnedrivning eller bygning over 50 m² kræver byggetilladelse." },
    { q: "Er det BoligJob-berettiget?", a: "Ja — nedrivning som led i renovering på helårsbolig er fradragsberettiget på arbejdsløn." },
  ],
  sections: [
    { heading: "Pris pr. type", list: ["Indvendig delvis (skillevæg): 195–495 kr./m².","Indvendig totalt (alt til råhus): 395–795 kr./m².","Totalnedrivning villa: 595–1.295 kr./m².","Carport/skur: 295–595 kr./m²."] },
    { heading: "Tillæg", list: ["Asbestsanering: 250–595 kr./m² ekstra.","Blymaling-sanering: 395–895 kr./m² ekstra.","Container + bortkørsel: 4.500–18.500 kr.","Tilladelse + tegninger: 4.500–15.000 kr."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/asbestsanering-pris-2026">Asbestsanering pris</Link></li>
        <li key="l1"><Link to="/blog/badevaerelse-renovering-pris-2026">Badeværelse renovering pris</Link></li>
        <li key="l2"><Link to="/haandvaerker">Find håndværker</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
