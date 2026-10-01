import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "haveabonnement-pris",
  keywords: "haveabonnement pris, fast haveservice pris, græsslåning abonnement, havemand pris pr måned, haveservice aftale",
  faq: [
    { q: "Hvad koster et haveabonnement om måneden?", a: "For et almindeligt parcelhus ligger et abonnement med græsklip hver 14. dag typisk på 600–1.400 kr. om måneden i sæsonen inkl. moms." },
    { q: "Hvad er inkluderet i et haveabonnement?", a: "Oftest græsslåning og kantklip. Hækklipning, lugning og bortkørsel af haveaffald er typisk tilvalg." },
    { q: "Kan jeg få BoligJob-fradrag?", a: "Ja, almindeligt havearbejde som græsslåning, hækklipning og lugning er omfattet. Betal elektronisk og få fakturaen med arbejdsløn adskilt." },
    { q: "Hvornår løber sæsonen?", a: "Typisk fra april til oktober. Nogle firmaer tilbyder snerydning om vinteren på samme aftale." },
  ],
  sections: [
    { paragraphs: ["Et haveabonnement betyder, at haven bliver passet på faste dage, uden at du skal bestille hver gang. Her er prisniveauerne i 2026 inkl. moms for et almindeligt parcelhus med 400–800 m² have."] },
    { heading: "Typiske priser 2026", list: [
      "Græsklip hver 14. dag: 300–700 kr. pr. besøg",
      "Græsklip ugentligt: 250–600 kr. pr. besøg",
      "Hækklipning 2× årligt: 30–70 kr. pr. løbende meter",
      "Lugning af bede: timepris 300–550 kr.",
      "Bortkørsel af haveaffald: 200–500 kr. pr. læs",
    ] },
    { heading: "Abonnement eller enkeltbesøg?", paragraphs: [
      "Et abonnement er næsten altid billigere pr. besøg, fordi firmaet kan planlægge sine ruter. Enkeltbesøg giver mening, hvis du kun skal have hjælp til forårsoprydning eller en enkelt hækklipning.",
    ] },
    { heading: "Spørg om dette, før du skriver under", ordered: [
      "Hvad sker der, hvis et besøg aflyses pga. regn?",
      "Er bortkørsel af haveaffald inkluderet?",
      "Hvordan opsiges aftalen, og er der binding?",
      "Hvordan fremgår arbejdsløn på fakturaen (fradrag)?",
    ] },
    { heading: "Læs også", body: (
      <ul>
        <li><Link to="/priser/haveservice">Prisguide: haveservice</Link></li>
        <li><Link to="/blog/aarshjul-for-haveservice">Årshjul for haveservice</Link></li>
        <li><Link to="/tilbud">Indhent 3 tilbud på haveservice</Link></li>
      </ul>
    ) },
  ],
});
