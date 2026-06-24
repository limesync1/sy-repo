import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "laasesmed-pris-doeraabning-2026",
  keywords: "låsesmed pris døråbning 2026, akut låsesmed, pris låsesmed nat",
  faq: [
    { q: "Hvad koster en låsesmed til at åbne døren?", a: "Dagtid 695–1.495 kr., aften/nat/weekend 1.595–2.795 kr. inkl. moms." },
    { q: "Skal jeg betale udkald oveni?", a: "Det skal være INKLUSIV. Bondefanger-firmaer opkræver 595–1.495 kr. ekstra i udkald — bekræft fast pris INDEN besøget." },
    { q: "Bliver låsen ødelagt?", a: "Nej — professionel låsemester åbner uden at ødelægge cylinderen. Hvis han skal bore: aftal det på forhånd." },
    { q: "Hvad gør jeg ved indbrud?", a: "Tilkald politi FØRST, dokumentér til forsikring, og bed låsesmeden om midlertidig sikring + ny cylinder inden 24 timer." },
  ],
  sections: [
    { heading: "Sådan undgår du bondefangere", list: ["Ring til 3 firmaer — kræv fast totalpris på telefonen.","Spørg om CVR og momsregistrering.","Få det skriftligt FØR de starter.","Vær mistænksom over for priser under 595 kr. (ofte skjulte tillæg)."] },
    { heading: "Typiske faste priser", list: ["Standard døråbning (dagtid): 695–1.495 kr.","Aften/nat/weekend: 1.595–2.795 kr.","Boring + ny cylinder: 2.495–4.500 kr.","Ny lås (komplet sæt): 1.950–3.950 kr."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/laasesmed">Find låsesmed</Link></li>
        <li key="l1"><Link to="/tilbud">Få 3 tilbud på sikring af bolig</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
