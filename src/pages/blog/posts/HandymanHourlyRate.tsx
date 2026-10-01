import { Link } from "react-router-dom";
import { defineBlogPost } from "../defineBlogPost";

export default defineBlogPost({
  slug: "handyman-timepris-2026",
  keywords: "handyman timepris, handyman pris, altmuligmand pris, handyman pr time",
  faq: [
    { q: "Hvad koster en handyman pr. time?", a: "Typisk 350–550 kr. pr. time inkl. moms. Mange har et minimumsbeløb eller kørselsgebyr på 150–350 kr." },
    { q: "Hvilke opgaver laver en handyman?", a: "Små reparationer, montering af møbler og lamper, ophængning, mindre maler- og tømreropgaver. Autoriseret el- og VVS-arbejde kræver autoriseret håndværker." },
    { q: "Kan jeg få fradrag for handyman?", a: "Ja, en del håndværksopgaver er omfattet af håndværkerfradraget. Tjek de aktuelle regler hos Skattestyrelsen." },
  ],
  sections: [
    { paragraphs: ["En handyman er den hurtige løsning til de mange små opgaver i hjemmet. Her er hvad det koster i 2026, og hvordan du får mest ud af timerne."] },
    { heading: "Typiske priser 2026", list: [
      "Timepris: 350–550 kr. inkl. moms",
      "Kørsel/opstart: 150–350 kr.",
      "Møbelmontering: 300–900 kr. pr. møbel",
      "Ophængning af TV: 500–1.200 kr.",
    ] },
    { heading: "Få mest ud af besøget", list: [
      "Saml flere små opgaver på én liste",
      "Hav materialer klar, eller aftal hvem der køber ind",
      "Bed om fast pris på veldefinerede opgaver",
    ] },
    { heading: "Læs også", body: (
      <ul>
        <li><Link to="/guides/haandvaerker">Håndværker-guide</Link></li>
        <li><Link to="/tilbud">Indhent 3 tilbud fra en handyman</Link></li>
      </ul>
    ) },
  ],
});
