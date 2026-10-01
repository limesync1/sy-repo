import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "vinduespudsning-abonnement-pris",
  keywords: "vinduespudsning abonnement, fast vinduespudser pris, vinduespudsning hver 4. uge, vinduespudser aftale",
  faq: [
    { q: "Hvad koster vinduespudsning på abonnement?", a: "For et almindeligt parcelhus koster udvendig pudsning hver 4.–8. uge typisk 150–350 kr. pr. gang inkl. moms." },
    { q: "Hvor tit bør vinduer pudses?", a: "De fleste vælger hver 4., 6. eller 8. uge. Huse tæt på vej eller kyst har ofte brug for hyppigere pudsning." },
    { q: "Er vinduespudsning fradragsberettiget?", a: "Ja, vinduespudsning er omfattet af servicefradraget, når arbejdslønnen er adskilt på fakturaen og der betales elektronisk." },
  ],
  sections: [
    { paragraphs: ["Fast vinduespudsning er en af de mest populære serviceaftaler i Danmark. Her er de typiske priser i 2026 og hvad du skal tjekke, før du indgår en aftale."] },
    { heading: "Typiske priser 2026", list: [
      "Rækkehus, udvendig: 120–220 kr. pr. gang",
      "Parcelhus, udvendig: 150–350 kr. pr. gang",
      "Indvendig + udvendig: 350–800 kr. pr. gang",
      "Ovenlysvinduer og karme: ofte tillæg på 50–150 kr.",
    ] },
    { heading: "Hvad påvirker prisen?", list: [
      "Antal ruder og sprosser",
      "Adgang: stige, førstesal, udestue",
      "Interval — kortere interval giver ofte lavere pris pr. gang",
      "Om rammer og karme er inkluderet",
    ] },
    { heading: "Tjek dette i aftalen", ordered: [
      "Hvad sker der ved regnvejr eller frost?",
      "Er der binding eller opsigelsesvarsel?",
      "Skal du være hjemme ved pudsningen?",
      "Fremgår arbejdsløn tydeligt på fakturaen?",
    ] },
    { heading: "Læs også", body: (
      <ul>
        <li><Link to="/priser/vinduespudsning">Prisguide: vinduespudsning</Link></li>
        <li><Link to="/tilbud">Indhent 3 tilbud på vinduespudsning</Link></li>
      </ul>
    ) },
  ],
});
