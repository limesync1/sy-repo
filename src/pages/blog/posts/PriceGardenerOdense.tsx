import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

const Post = defineBlogPost({
  slug: "haveservice-odense-pris-2026",
  keywords: "haveservice Odense pris 2026, havemand fyn",
  faq: [
    { q: "Hvad koster en havemand i Odense?", a: "Timepris 285–445 kr. inkl. moms før BoligJob. Reelt 215–335 kr. efter fradrag." },
    { q: "Hvornår er det billigst?", a: "Sen-efterår og vinter (november–februar) har 15–25% lavere efterspørgsel." },
    { q: "Hvilke områder dækker?", a: "Odense + Munkebo, Otterup, Nyborg, Middelfart." },
    { q: "Er BoligJob-fradraget muligt?", a: "Ja — 25% retur på arbejdsløn op til 12.900 kr./person/år." },
  ],
  sections: [
    { heading: "Pris pr. zone", list: ["Odense C: 345–445 kr./time.","Hjallese + Bolbro: 315–395 kr./time.","Munkebo + Otterup: 285–365 kr./time."] },
    { heading: "Pakkepriser", list: ["Plæneklipning sæson: 4.500–9.500 kr.","Hækklipning 2× årligt: 2.200–4.800 kr.","Helårspakke: 16.500–34.500 kr."] },
    { heading: "Læs også", body: (
      <ul>
        <li key="l0"><Link to="/blog/havemand-pris-koebenhavn-2026">Havemand pris København</Link></li>
        <li key="l1"><Link to="/blog/haveservice-pris-aarhus-2026">Haveservice pris Aarhus</Link></li>
        <li key="l2"><Link to="/haveservice/odense">Find haveservice i Odense</Link></li>
      </ul>
    ) },
  ],
});

export default Post;
