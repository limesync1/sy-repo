import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "flytterengoering-tjekliste",
  keywords: "flytterengøring tjekliste, flytterengøring hvad skal gøres, flyttesyn rengøring, få depositum tilbage",
  faq: [
    { q: "Hvad skal med i en flytterengøring?", a: "Alle overflader, køkken inkl. ovn og emhætte, bad inkl. kalk, vinduer, paneler, døre, skabe indvendigt og gulve." },
    { q: "Hvad koster professionel flytterengøring?", a: "For en lejlighed på 70–90 m² typisk 2.500–4.500 kr. inkl. moms. Mange firmaer giver garanti ved flyttesyn." },
    { q: "Hvornår skal flytterengøringen laves?", a: "Efter at alle møbler er ude og senest dagen før flyttesynet." },
  ],
  sections: [
    { paragraphs: ["En grundig flytterengøring er den sikreste vej til at få depositum tilbage. Brug tjeklisten rum for rum — eller lad et firma med flyttesynsgaranti klare det."] },
    { heading: "Køkken", list: ["Ovn, plader og emhætte affedtes", "Køleskab og fryser afrimes og vaskes", "Skabe og skuffer indvendigt", "Fliser og fuger"] },
    { heading: "Badeværelse", list: ["Kalk fjernes fra fliser, armaturer og bruseniche", "Toilet inkl. fod og bagside", "Afløb renses", "Spejl og skabe"] },
    { heading: "Alle rum", list: ["Vinduer, karme og vindueskarme", "Paneler, døre og dørkarme", "Kontakter og radiatorer", "Gulve støvsuges og vaskes"] },
    { heading: "Læs også", body: (
      <ul>
        <li><Link to="/blog/flytning-og-flytterengoering-samlet">Flytning og flytterengøring samlet</Link></li>
        <li><Link to="/tilbud">Indhent 3 tilbud på flytterengøring</Link></li>
      </ul>
    ) },
  ],
});
