import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "flytning-og-flytterengoering-samlet",
  keywords: "flytning og flytterengøring, flyttefirma med rengøring, samlet tilbud flytning, flytterengøring pris, depositum tilbage",
  faq: [
    { q: "Kan jeg få flytning og flytterengøring hos samme firma?", a: "Ja, mange flyttefirmaer tilbyder flytterengøring selv eller via en fast samarbejdspartner. Det giver ét tilbud og én kontaktperson." },
    { q: "Hvornår skal flytterengøringen ske?", a: "Efter at alt er båret ud og før syn af lejemålet — typisk samme dag eller dagen efter flytningen." },
    { q: "Hvad koster flytterengøring?", a: "Typisk 25–45 kr. pr. m² inkl. moms. En lejlighed på 70 m² ligger ofte på 2.000–3.500 kr." },
    { q: "Er der garanti ved flyttesyn?", a: "Spørg efter det. Seriøse firmaer kommer tilbage og udbedrer gratis, hvis udlejer påpeger mangler ved rengøringen." },
  ],
  sections: [
    { paragraphs: ["At bestille flytning og flytterengøring samlet sparer koordinering og giver ofte en bedre pris. Her er, hvad du skal være opmærksom på, så du får dit depositum tilbage."] },
    { heading: "Fordele ved at samle det", list: [
      "Ét tilbud og én faktura",
      "Rengøringen planlægges præcist efter flytningen",
      "Ofte rabat ved samlet bestilling",
      "Én kontaktperson, hvis noget går galt",
    ] },
    { heading: "Typisk tidsplan", ordered: [
      "Dag 1: Nedpakning og udbæring",
      "Dag 1–2: Flytterengøring af den gamle bolig",
      "Dag 2–3: Flyttesyn med udlejer",
    ] },
    { heading: "Tjek dette i tilbuddet", list: [
      "Er ovn, emhætte, køleskab og vinduer inkluderet i rengøringen?",
      "Er der garanti ved flyttesyn?",
      "Fast pris eller timepris for begge dele?",
    ] },
    { heading: "Læs også", body: (
      <ul>
        <li><Link to="/priser/flyttehjaelp">Prisguide: flyttehjælp</Link></li>
        <li><Link to="/blog/tjekliste-til-flyttedag">Tjekliste til flyttedag</Link></li>
        <li><Link to="/tilbud">Indhent 3 tilbud</Link></li>
      </ul>
    ) },
  ],
});
